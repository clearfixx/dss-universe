import { ForbiddenException } from '@nestjs/common';
import { createEmptyEditorDocument } from '@dss/editor';

import type { AuthenticatedUser } from '@api/core/auth';
import type { PermissionsService } from '@api/core/authorization';
import type { NewsService } from '../../application/services/news.service';
import type { NewsWorkflowService } from '../../application/services/news-workflow.service';
import type { NewsArticle } from '../../domain/types/news-article.type';
import {
  NewsPostTypeModel,
  NewsVisibilityModel,
} from './news-delivery.graphql';
import { NewsEditorialResolver } from './news-editorial.graphql';

describe('NewsEditorialResolver', () => {
  const actor = { id: 'author-1' } as AuthenticatedUser;
  const article = {
    id: '123e4567-e89b-42d3-a456-426614174000',
    interactionTargetId: '123e4567-e89b-42d3-a456-426614174001',
    authorId: actor.id,
    postType: 'STANDARD',
    status: 'DRAFT',
    visibility: 'PUBLIC',
    language: 'uk',
    slug: 'station-update',
    title: 'Station update',
    shortText: 'A concise station update.',
    document: createEmptyEditorDocument('NEWS'),
    templateData: {},
    coverMediaId: null,
    currentVersion: 1,
    approvedVersion: null,
    allowComments: true,
    allowRating: true,
    allowSharing: true,
    allowIndexing: true,
    showOnHomepage: true,
    featured: false,
    submittedAt: null,
    approvedAt: null,
    scheduledFor: null,
    publishedAt: null,
    displayPublishedAt: null,
    createdAt: new Date('2026-09-22T10:00:00Z'),
    updatedAt: new Date('2026-09-22T10:00:00Z'),
  } as NewsArticle;
  let createDraft: jest.Mock;
  let findById: jest.Mock;
  let listEditorial: jest.Mock;
  let approve: jest.Mock;
  let access: jest.Mock;
  let resolver: NewsEditorialResolver;

  beforeEach(() => {
    createDraft = jest.fn().mockResolvedValue(article);
    findById = jest.fn().mockResolvedValue(article);
    listEditorial = jest.fn().mockResolvedValue({
      items: [article],
      total: 1,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    });
    approve = jest.fn().mockResolvedValue({
      article: { ...article, status: 'APPROVED' },
      decision: {
        id: 'decision-1',
        articleId: article.id,
        revisionVersion: 1,
        actorId: 'reviewer-1',
        action: 'APPROVED',
        reason: null,
        createdAt: new Date(),
      },
    });
    access = jest.fn().mockResolvedValue({ roles: [], permissions: [] });
    resolver = new NewsEditorialResolver(
      {
        createDraft,
        findById,
        listEditorial,
      } as unknown as NewsService,
      { approve } as unknown as NewsWorkflowService,
      { getAccessProfileByUserId: access } as unknown as PermissionsService,
    );
  });

  it('derives draft ownership exclusively from the authenticated actor', async () => {
    await resolver.createNewsDraft(actor, {
      postType: NewsPostTypeModel.STANDARD,
      visibility: NewsVisibilityModel.PUBLIC,
      language: 'uk',
      slug: 'station-update',
      title: 'Station update',
      shortText: 'A concise station update.',
      documentJson: JSON.stringify(article.document),
      templateDataJson: '{"layout":"wide"}',
    });

    expect(createDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        authorId: actor.id,
        coverMediaId: null,
        templateData: { layout: 'wide' },
      }),
    );
  });

  it('allows the author to read the canonical editorial document', async () => {
    await expect(
      resolver.newsEditorialArticle(actor, article.id),
    ).resolves.toMatchObject({
      id: article.id,
      documentJson: JSON.stringify(article.document),
    });
    expect(access).not.toHaveBeenCalled();
  });

  it('scopes an ordinary editorial list to the authenticated author', async () => {
    await resolver.editorialNews(actor);
    expect(listEditorial).toHaveBeenCalledWith({
      actorId: actor.id,
      includeAll: false,
      statuses: undefined,
      page: 1,
      pageSize: 20,
    });
  });

  it('opens the editorial queue only to a reviewer', async () => {
    access.mockResolvedValue({ roles: [], permissions: ['news.review'] });
    await resolver.editorialNews({ id: 'reviewer-1' } as AuthenticatedUser, {
      statuses: [],
      page: 2,
      pageSize: 10,
    });
    expect(listEditorial).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'reviewer-1',
        includeAll: true,
        page: 2,
        pageSize: 10,
      }),
    );
  });

  it('denies another user without review or publish permission', async () => {
    await expect(
      resolver.newsEditorialArticle(
        { id: 'other-1' } as AuthenticatedUser,
        article.id,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('delegates approval to the permission-enforcing workflow service', async () => {
    await resolver.approveNews({ id: 'reviewer-1' } as AuthenticatedUser, {
      articleId: article.id,
    });
    expect(approve).toHaveBeenCalledWith('reviewer-1', article.id, undefined);
  });
});
