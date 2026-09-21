import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';

import type { PermissionsService } from '@api/core/authorization';
import type { NewsRepository } from '../../domain/repositories/news.repository.interface';
import type { NewsWorkflowRepository } from '../../domain/repositories/news-workflow.repository.interface';
import type { NewsEditorialTransition } from '../../domain/types/news-editorial.type';
import type { NewsArticle } from '../../domain/types/news-article.type';
import { NewsPostTemplateService } from './news-post-template.service';
import { NewsWorkflowService } from './news-workflow.service';

describe('NewsWorkflowService', () => {
  let news: jest.Mocked<NewsRepository>;
  let workflow: jest.Mocked<NewsWorkflowRepository>;
  let permissions: Pick<PermissionsService, 'getAccessProfileByUserId'>;
  let access: jest.Mock;
  let transition: jest.Mock;
  let service: NewsWorkflowService;
  const draft = {
    id: 'article-1',
    authorId: 'author-1',
    status: 'DRAFT',
    currentVersion: 2,
    approvedVersion: null,
    postType: 'STANDARD',
    templateData: {},
    coverMediaId: 'cover-1',
    plainText: 'Complete article text.',
  } as NewsArticle;

  beforeEach(() => {
    news = {
      createDraft: jest.fn(),
      findById: jest.fn().mockResolvedValue(draft),
      findBySlug: jest.fn(),
      saveDraft: jest.fn(),
    };
    transition = jest
      .fn()
      .mockImplementation((input: NewsEditorialTransition) =>
        Promise.resolve({
          article: { ...draft, status: input.nextStatus },
          decision: {
            id: 'decision-1',
            articleId: input.articleId,
            actorId: input.actorId,
            revisionVersion: input.expectedVersion,
            action: input.action,
            reason: input.reason,
            createdAt: new Date(),
          },
        }),
      );
    workflow = { transition, publishDue: jest.fn().mockResolvedValue([]) };
    access = jest.fn().mockResolvedValue({ roles: [], permissions: [] });
    permissions = { getAccessProfileByUserId: access };
    service = new NewsWorkflowService(
      news,
      workflow,
      new NewsPostTemplateService(),
      permissions as PermissionsService,
    );
  });

  it('lets the author submit a complete draft', async () => {
    await expect(service.submit('author-1', draft.id)).resolves.toMatchObject({
      article: { status: 'IN_REVIEW' },
    });
    expect(transition).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedStatus: 'DRAFT',
        nextStatus: 'IN_REVIEW',
        action: 'SUBMITTED',
      }),
    );
  });

  it('denies review decisions without the narrow permission', async () => {
    news.findById.mockResolvedValue({ ...draft, status: 'IN_REVIEW' });
    await expect(
      service.approve('reviewer-1', draft.id),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(transition).not.toHaveBeenCalled();
  });

  it('approves with news.review and pins the current revision', async () => {
    access.mockResolvedValue({ roles: [], permissions: ['news.review'] });
    news.findById.mockResolvedValue({ ...draft, status: 'IN_REVIEW' });
    await service.approve('reviewer-1', draft.id);
    expect(transition).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'APPROVED', expectedVersion: 2 }),
    );
  });

  it('refuses publishing when approval belongs to another revision', async () => {
    access.mockResolvedValue({ roles: [], permissions: ['news.publish'] });
    news.findById.mockResolvedValue({
      ...draft,
      status: 'APPROVED',
      approvedVersion: 1,
    });
    await expect(
      service.publish('publisher-1', draft.id),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('schedules an approved revision with a privileged display date', async () => {
    access.mockResolvedValue({ roles: [], permissions: ['news.publish'] });
    news.findById.mockResolvedValue({
      ...draft,
      status: 'APPROVED',
      approvedVersion: 2,
    });
    const scheduledFor = new Date(Date.now() + 60 * 60 * 1000);
    const displayPublishedAt = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await service.schedule(
      'publisher-1',
      draft.id,
      scheduledFor,
      displayPublishedAt,
    );
    expect(transition).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'SCHEDULED',
        nextStatus: 'SCHEDULED',
        scheduledFor,
        displayPublishedAt,
      }),
    );
  });

  it('rejects schedules that are not safely in the future', async () => {
    access.mockResolvedValue({ roles: [], permissions: ['news.publish'] });
    news.findById.mockResolvedValue({
      ...draft,
      status: 'APPROVED',
      approvedVersion: 2,
    });
    await expect(
      service.schedule('publisher-1', draft.id, new Date()),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
