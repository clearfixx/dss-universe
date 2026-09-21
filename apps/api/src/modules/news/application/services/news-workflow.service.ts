import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  Permission,
  type PermissionKey,
  PermissionsService,
} from '@api/core/authorization';
import {
  NEWS_REPOSITORY,
  type NewsRepository,
} from '../../domain/repositories/news.repository.interface';
import {
  NEWS_WORKFLOW_REPOSITORY,
  type NewsWorkflowRepository,
} from '../../domain/repositories/news-workflow.repository.interface';
import type { NewsEditorialTransitionResult } from '../../domain/types/news-editorial.type';
import type { NewsArticle } from '../../domain/types/news-article.type';
import { NewsPostTemplateService } from './news-post-template.service';

@Injectable()
export class NewsWorkflowService {
  constructor(
    @Inject(NEWS_REPOSITORY) private readonly news: NewsRepository,
    @Inject(NEWS_WORKFLOW_REPOSITORY)
    private readonly workflow: NewsWorkflowRepository,
    private readonly templates: NewsPostTemplateService,
    private readonly permissions: PermissionsService,
  ) {}

  async submit(
    actorId: string,
    articleId: string,
  ): Promise<NewsEditorialTransitionResult> {
    const article = await this.article(articleId);
    if (article.authorId !== actorId) {
      throw new ForbiddenException('Only the News author may submit it.');
    }
    if (article.status !== 'DRAFT' && article.status !== 'CHANGES_REQUESTED') {
      throw new ConflictException('This News article cannot be submitted.');
    }
    this.templates.assertReady(article);
    return this.transition(article, actorId, 'IN_REVIEW', 'SUBMITTED', null);
  }

  async requestChanges(
    actorId: string,
    articleId: string,
    reason: string,
  ): Promise<NewsEditorialTransitionResult> {
    await this.requirePermission(actorId, Permission.NewsReview);
    const normalizedReason = reason.trim();
    if (normalizedReason.length < 5 || normalizedReason.length > 1000) {
      throw new BadRequestException(
        'A change request reason must be 5–1000 characters.',
      );
    }
    const article = await this.article(articleId);
    if (article.status !== 'IN_REVIEW') {
      throw new ConflictException('Only News in review may request changes.');
    }
    return this.transition(
      article,
      actorId,
      'CHANGES_REQUESTED',
      'CHANGES_REQUESTED',
      normalizedReason,
    );
  }

  async approve(
    actorId: string,
    articleId: string,
    reason?: string,
  ): Promise<NewsEditorialTransitionResult> {
    await this.requirePermission(actorId, Permission.NewsReview);
    const article = await this.article(articleId);
    if (article.status !== 'IN_REVIEW') {
      throw new ConflictException('Only News in review may be approved.');
    }
    this.templates.assertReady(article);
    return this.transition(
      article,
      actorId,
      'APPROVED',
      'APPROVED',
      reason?.trim() || null,
    );
  }

  async publish(
    actorId: string,
    articleId: string,
    displayPublishedAt?: Date,
  ): Promise<NewsEditorialTransitionResult> {
    await this.requirePermission(actorId, Permission.NewsPublish);
    const article = await this.article(articleId);
    if (article.status !== 'APPROVED') {
      throw new ConflictException('Only approved News may be published.');
    }
    if (article.approvedVersion !== article.currentVersion) {
      throw new ConflictException(
        'The approved revision is no longer the current revision.',
      );
    }
    this.templates.assertReady(article);
    const displayDate = displayPublishedAt
      ? this.assertDisplayDate(displayPublishedAt, new Date())
      : undefined;
    return this.transition(article, actorId, 'PUBLISHED', 'PUBLISHED', null, {
      displayPublishedAt: displayDate,
    });
  }

  async schedule(
    actorId: string,
    articleId: string,
    scheduledFor: Date,
    displayPublishedAt?: Date,
  ): Promise<NewsEditorialTransitionResult> {
    await this.requirePermission(actorId, Permission.NewsPublish);
    const article = await this.article(articleId);
    if (article.status !== 'APPROVED') {
      throw new ConflictException('Only approved News may be scheduled.');
    }
    if (article.approvedVersion !== article.currentVersion) {
      throw new ConflictException(
        'The approved revision is no longer the current revision.',
      );
    }
    this.templates.assertReady(article);
    const now = new Date();
    const publicationDate = this.assertScheduleDate(scheduledFor, now);
    const displayDate = displayPublishedAt
      ? this.assertDisplayDate(displayPublishedAt, publicationDate)
      : publicationDate;
    return this.transition(article, actorId, 'SCHEDULED', 'SCHEDULED', null, {
      scheduledFor: publicationDate,
      displayPublishedAt: displayDate,
    });
  }

  async cancelSchedule(
    actorId: string,
    articleId: string,
    reason: string,
  ): Promise<NewsEditorialTransitionResult> {
    await this.requirePermission(actorId, Permission.NewsPublish);
    const normalizedReason = reason.trim();
    if (normalizedReason.length < 5 || normalizedReason.length > 1000) {
      throw new BadRequestException(
        'A schedule cancellation reason must be 5–1000 characters.',
      );
    }
    const article = await this.article(articleId);
    if (article.status !== 'SCHEDULED') {
      throw new ConflictException('Only scheduled News may be unscheduled.');
    }
    return this.transition(
      article,
      actorId,
      'APPROVED',
      'SCHEDULE_CANCELLED',
      normalizedReason,
    );
  }

  publishDue(now = new Date(), limit = 50) {
    const boundedLimit = Math.min(Math.max(Math.trunc(limit), 1), 100);
    return this.workflow.publishDue(now, boundedLimit);
  }

  private async article(articleId: string): Promise<NewsArticle> {
    const article = await this.news.findById(articleId);
    if (!article) throw new NotFoundException('News article was not found.');
    return article;
  }

  private async requirePermission(
    actorId: string,
    permission: PermissionKey,
  ): Promise<void> {
    const profile = await this.permissions.getAccessProfileByUserId(actorId);
    if (!profile.permissions.includes(permission)) {
      throw new ForbiddenException(`Missing permission: ${permission}.`);
    }
  }

  private async transition(
    article: NewsArticle,
    actorId: string,
    nextStatus: NewsArticle['status'],
    action: Parameters<NewsWorkflowRepository['transition']>[0]['action'],
    reason: string | null,
    dates: Pick<
      Parameters<NewsWorkflowRepository['transition']>[0],
      'scheduledFor' | 'displayPublishedAt'
    > = {},
  ): Promise<NewsEditorialTransitionResult> {
    const result = await this.workflow.transition({
      articleId: article.id,
      actorId,
      expectedStatus: article.status,
      expectedVersion: article.currentVersion,
      nextStatus,
      action,
      reason,
      ...dates,
    });
    if (!result) {
      throw new ConflictException(
        'The News editorial state changed in another session.',
      );
    }
    return result;
  }

  private assertScheduleDate(value: Date, now: Date): Date {
    const date = new Date(value);
    const minimum = now.getTime() + 60_000;
    const maximum = now.getTime() + 366 * 24 * 60 * 60 * 1000;
    if (
      Number.isNaN(date.getTime()) ||
      date.getTime() < minimum ||
      date.getTime() > maximum
    ) {
      throw new BadRequestException(
        'Scheduled publication must be 1 minute to 366 days in the future.',
      );
    }
    return date;
  }

  private assertDisplayDate(value: Date, activationDate: Date): Date {
    const date = new Date(value);
    const oldest = activationDate.getTime() - 20 * 366 * 24 * 60 * 60 * 1000;
    if (
      Number.isNaN(date.getTime()) ||
      date.getTime() > activationDate.getTime() ||
      date.getTime() < oldest
    ) {
      throw new BadRequestException(
        'Display publication date must not be future-dated or over 20 years old.',
      );
    }
    return date;
  }
}
