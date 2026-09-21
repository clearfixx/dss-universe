import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Permission, PermissionsService } from '@api/core/authorization';
import {
  NEWS_LINKS_REPOSITORY,
  type NewsLinksRepository,
} from '../../domain/repositories/news-links.repository.interface';
import {
  NEWS_REPOSITORY,
  type NewsRepository,
} from '../../domain/repositories/news.repository.interface';
import {
  NEWS_INTERNAL_LINK_TYPES,
  type NewsInternalLink,
  type NewsInternalLinkType,
} from '../../domain/types/news-links.type';

@Injectable()
export class NewsLinksService {
  constructor(
    @Inject(NEWS_LINKS_REPOSITORY)
    private readonly links: NewsLinksRepository,
    @Inject(NEWS_REPOSITORY) private readonly news: NewsRepository,
    private readonly permissions: PermissionsService,
  ) {}

  list(articleId: string): Promise<NewsInternalLink[]> {
    return this.links.list(articleId);
  }

  async create(
    actorId: string,
    input: {
      sourceArticleId: string;
      targetArticleId: string;
      type: NewsInternalLinkType;
      anchorText: string;
      position?: number;
    },
  ): Promise<NewsInternalLink> {
    await this.assertPermission(actorId);
    if (input.sourceArticleId === input.targetArticleId) {
      throw new BadRequestException('News cannot link to itself.');
    }
    if (!NEWS_INTERNAL_LINK_TYPES.includes(input.type)) {
      throw new BadRequestException('News link type is invalid.');
    }
    const anchorText = input.anchorText.trim();
    if (anchorText.length < 2 || anchorText.length > 180) {
      throw new BadRequestException(
        'News link anchor text must be 2–180 characters.',
      );
    }
    const position = input.position ?? 0;
    if (!Number.isInteger(position) || position < 0 || position > 1000) {
      throw new BadRequestException(
        'News link position must be an integer between 0 and 1000.',
      );
    }
    const [source, target] = await Promise.all([
      this.news.findById(input.sourceArticleId),
      this.news.findById(input.targetArticleId),
    ]);
    if (!source || !target) {
      throw new NotFoundException('News link article was not found.');
    }
    if (source.status !== 'PUBLISHED' || target.status !== 'PUBLISHED') {
      throw new ConflictException(
        'SEO links may connect only published News articles.',
      );
    }
    const created = await this.links.create({
      ...input,
      anchorText,
      position,
      actorId,
    });
    if (!created) {
      throw new ConflictException('This News SEO link already exists.');
    }
    return created;
  }

  async remove(actorId: string, linkId: string): Promise<void> {
    await this.assertPermission(actorId);
    if (!(await this.links.remove(linkId, actorId))) {
      throw new NotFoundException('News SEO link was not found.');
    }
  }

  private async assertPermission(actorId: string): Promise<void> {
    const profile = await this.permissions.getAccessProfileByUserId(actorId);
    if (!profile.permissions.includes(Permission.NewsLinksManage)) {
      throw new ForbiddenException(
        `Missing permission: ${Permission.NewsLinksManage}.`,
      );
    }
  }
}
