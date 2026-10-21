/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 🧪 Module: News Foundation Verification
 * 📄 File: apps/api/test/news-domain-foundation.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Verifies migrated News foundation transactions and their existing HTTP projections.
 *
 * 🏗️ Architecture:
 * Integration test may obtain private providers for fixture setup, not public feature APIs.
 *
 * ⚠️ Important:
 * Preserve existing assertions; test-only imports do not justify production exports.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import {
  ConflictException,
  ForbiddenException,
  type INestApplication,
} from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { createEmptyEditorDocument } from '@dss/editor';
import { randomUUID } from 'node:crypto';
import type { App } from 'supertest/types';

import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/core/database';
import { InteractionTargetsService } from './../src/modules/interactions/application/services/interaction-targets.service';
import { NewsDeliveryService } from './../src/modules/news/application/services/news-delivery.service';
import { NewsLinksService } from './../src/modules/news/application/services/news-links.service';
import { NewsService } from './../src/modules/news/application/services/news.service';
import { NewsSettingsService } from './../src/modules/news/application/services/news-settings.service';
import { NewsTaxonomyService } from './../src/modules/news/application/services/news-taxonomy.service';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';
import { NewsWorkflowService } from './../src/modules/news/application/services/news-workflow.service';

describe('News domain foundation (e2e)', () => {
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let news: NewsService;
  let targets: InteractionTargetsService;
  let taxonomy: NewsTaxonomyService;
  let workflow: NewsWorkflowService;
  let delivery: NewsDeliveryService;
  let links: NewsLinksService;
  let settings: NewsSettingsService;
  const articleIds: string[] = [];
  const userIds: string[] = [];
  const taxonomyIds: string[] = [];
  const linkIds: string[] = [];
  const commentTargetIds: string[] = [];

  beforeAll(async () => {
    fixture = await createIsolatedApiSchemaFixture();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(fixture.prisma)
      .compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    news = app.get(NewsService);
    targets = app.get(InteractionTargetsService);
    taxonomy = app.get(NewsTaxonomyService);
    workflow = app.get(NewsWorkflowService);
    delivery = app.get(NewsDeliveryService);
    links = app.get(NewsLinksService);
    settings = app.get(NewsSettingsService);
  });

  afterAll(async () => {
    try {
      await app?.close();
    } finally {
      await fixture?.close();
    }
  });

  it('creates one draft, revision, interaction identity and evidence atomically', async () => {
    const suffix = Date.now().toString(36);
    const author = await prisma.user.create({
      data: {
        email: `news-${suffix}@example.com`,
        username: `news-${suffix}`,
        passwordHash: 'not-used-by-this-test',
      },
    });
    userIds.push(author.id);

    const category = await taxonomy.createCategory({
      actorId: author.id,
      parentId: null,
      name: 'Development',
      slug: `development-${suffix}`,
      description: 'Developer platform news.',
      icon: 'code',
      sortOrder: 10,
      isActive: true,
      allowedPostTypes: ['STANDARD', 'TEXT'],
      allowComments: true,
      allowRating: true,
      allowIndexing: true,
    });
    const tag = await taxonomy.createTag({
      actorId: author.id,
      name: 'Platform',
      slug: `platform-${suffix}`,
    });
    const field = await taxonomy.createFieldDefinition({
      actorId: author.id,
      categoryId: category.id,
      postType: 'STANDARD',
      key: `difficulty_${suffix}`,
      label: 'Difficulty',
      type: 'SELECT',
      required: false,
      showInShort: true,
      showInFull: true,
      includeInSearch: true,
      filterable: true,
      options: ['beginner', 'advanced'],
      isActive: true,
    });
    taxonomyIds.push(category.id, tag.id, field.id);

    const document = createEmptyEditorDocument('NEWS');
    document.content.content = [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'The station is online.' }],
      },
    ];
    const article = await news.createDraft({
      authorId: author.id,
      postType: 'STANDARD',
      visibility: 'PUBLIC',
      language: 'uk',
      slug: `station-online-${suffix}`,
      title: 'Station online',
      shortText: 'The station has successfully returned online.',
      documentJson: JSON.stringify(document),
      coverMediaId: `cover-${suffix}`,
      templateData: {},
    });
    articleIds.push(article.id);

    expect(article).toMatchObject({
      authorId: author.id,
      status: 'DRAFT',
      currentVersion: 1,
      plainText: 'The station is online.',
    });
    await expect(
      prisma.newsRevision.findMany({ where: { articleId: article.id } }),
    ).resolves.toHaveLength(1);
    await expect(
      prisma.auditRecord.findFirst({
        where: {
          action: 'news.article.created',
          targetId: article.id,
        },
      }),
    ).resolves.toBeTruthy();
    await expect(
      prisma.outboxEvent.findFirst({
        where: {
          eventName: 'news.article.created.v1',
          aggregateId: article.id,
        },
      }),
    ).resolves.toBeTruthy();
    await expect(
      targets.authorize(
        article.interactionTargetId,
        { kind: 'AUTHENTICATED', subjectId: author.id },
        'COMMENT',
      ),
    ).resolves.toMatchObject({
      allowed: false,
      reason: 'NEWS_NOT_PUBLISHED',
    });

    document.content.content = [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'The station is fully operational.' }],
      },
    ];
    const saved = await news.saveDraft(author.id, {
      articleId: article.id,
      baseVersion: 1,
      changeSummary: 'Expanded status',
      postType: 'STANDARD',
      visibility: 'PUBLIC',
      language: 'uk',
      slug: article.slug,
      title: 'Station fully online',
      shortText: 'The station is fully operational for every developer.',
      documentJson: JSON.stringify(document),
      coverMediaId: `cover-${suffix}`,
      templateData: {},
    });
    expect(saved).toMatchObject({
      currentVersion: 2,
      plainText: 'The station is fully operational.',
    });
    await expect(
      prisma.newsRevision.findMany({ where: { articleId: article.id } }),
    ).resolves.toHaveLength(2);
    await expect(
      news.saveDraft(author.id, {
        articleId: article.id,
        baseVersion: 1,
        changeSummary: null,
        postType: 'STANDARD',
        visibility: 'PUBLIC',
        language: 'uk',
        slug: article.slug,
        title: 'Stale title',
        shortText: 'This stale tab must not overwrite the current draft.',
        documentJson: JSON.stringify(document),
        coverMediaId: `cover-${suffix}`,
        templateData: {},
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    const reviewer = await prisma.user.create({
      data: {
        email: `reviewer-${suffix}@example.com`,
        username: `reviewer-${suffix}`,
        passwordHash: 'not-used-by-this-test',
      },
    });
    const publisher = await prisma.user.create({
      data: {
        email: `publisher-${suffix}@example.com`,
        username: `publisher-${suffix}`,
        passwordHash: 'not-used-by-this-test',
      },
    });
    userIds.push(reviewer.id, publisher.id);
    const reviewPermission = await prisma.permission.upsert({
      where: { key: 'news.review' },
      create: { key: 'news.review', label: 'Review News' },
      update: {},
    });
    const publishPermission = await prisma.permission.upsert({
      where: { key: 'news.publish' },
      create: { key: 'news.publish', label: 'Publish News' },
      update: {},
    });
    const settingsPermission = await prisma.permission.upsert({
      where: { key: 'news.settings.manage' },
      create: { key: 'news.settings.manage', label: 'Manage News settings' },
      update: {},
    });
    const linksPermission = await prisma.permission.upsert({
      where: { key: 'news.links.manage' },
      create: { key: 'news.links.manage', label: 'Manage News links' },
      update: {},
    });
    await prisma.userPermission.createMany({
      data: [
        { userId: reviewer.id, permissionId: reviewPermission.id },
        { userId: publisher.id, permissionId: publishPermission.id },
        { userId: publisher.id, permissionId: settingsPermission.id },
        { userId: reviewer.id, permissionId: linksPermission.id },
      ],
    });

    await expect(workflow.submit(author.id, article.id)).resolves.toMatchObject(
      { article: { status: 'IN_REVIEW', currentVersion: 2 } },
    );
    await expect(
      workflow.approve(author.id, article.id),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      workflow.requestChanges(
        reviewer.id,
        article.id,
        'Please add one operational detail.',
      ),
    ).resolves.toMatchObject({ article: { status: 'CHANGES_REQUESTED' } });

    const revised = await news.saveDraft(author.id, {
      articleId: article.id,
      baseVersion: 2,
      changeSummary: 'Addressed editorial feedback',
      postType: 'STANDARD',
      visibility: 'PUBLIC',
      language: 'uk',
      slug: article.slug,
      title: 'Station fully online',
      shortText: 'The station is fully operational for every developer.',
      documentJson: JSON.stringify(document),
      coverMediaId: `cover-${suffix}`,
      templateData: {},
    });
    expect(revised.currentVersion).toBe(3);
    await workflow.submit(author.id, article.id);
    await expect(
      workflow.approve(reviewer.id, article.id, 'Ready for publication.'),
    ).resolves.toMatchObject({
      article: { status: 'APPROVED', approvedVersion: 3 },
    });
    const scheduledFor = new Date(Date.now() + 60 * 60 * 1000);
    const displayPublishedAt = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await expect(
      workflow.schedule(
        publisher.id,
        article.id,
        scheduledFor,
        displayPublishedAt,
      ),
    ).resolves.toMatchObject({
      article: {
        status: 'SCHEDULED',
        approvedVersion: 3,
        scheduledById: publisher.id,
        scheduledFor,
        displayPublishedAt,
      },
    });
    await expect(
      delivery.browseShort({ search: `station-online-${suffix}` }),
    ).resolves.toMatchObject({ items: [] });
    await expect(
      workflow.publishDue(new Date(scheduledFor.getTime() + 1)),
    ).resolves.toHaveLength(1);

    const commentId = randomUUID();
    const commentTargetId = randomUUID();
    commentTargetIds.push(commentTargetId);
    await prisma.interactionTarget.create({
      data: {
        id: commentTargetId,
        kind: 'comment',
        ownerModule: 'interactions',
        ownerType: 'Comment',
        ownerId: commentId,
      },
    });
    await prisma.comment.create({
      data: {
        id: commentId,
        interactionTargetId: article.interactionTargetId,
        reactionTargetId: commentTargetId,
        authorId: reviewer.id,
        body: 'A useful operational update.',
        document: createEmptyEditorDocument(
          'COMMENT',
        ) as unknown as Prisma.InputJsonValue,
        searchText: 'a useful operational update.',
      },
    });
    await prisma.reactionAggregate.create({
      data: {
        interactionTargetId: article.interactionTargetId,
        upvotes: 12,
        downvotes: 2,
        score: 10,
        total: 14,
      },
    });
    await prisma.reaction.createMany({
      data: [
        {
          interactionTargetId: article.interactionTargetId,
          actorId: author.id,
          kind: 'UPVOTE',
        },
        {
          interactionTargetId: article.interactionTargetId,
          actorId: reviewer.id,
          kind: 'DOWNVOTE',
        },
      ],
    });
    await prisma.bookmark.create({
      data: {
        interactionTargetId: article.interactionTargetId,
        ownerId: author.id,
      },
    });
    const shortNews = await delivery.browseShort(
      {
        language: 'uk',
        search: 'fully operational',
        first: 1,
      },
      author.id,
    );
    expect(shortNews).toMatchObject({
      hasNextPage: false,
      items: [
        {
          id: article.id,
          displayPublishedAt,
          engagement: {
            viewCount: 0,
            commentCount: 1,
            upvotes: 12,
            downvotes: 2,
            score: 10,
            bookmarkedByViewer: true,
          },
        },
      ],
    });
    expect(shortNews.endCursor).toEqual(expect.any(String));
    await prisma.interactionView.create({
      data: {
        interactionTargetId: article.interactionTargetId,
        actorId: author.id,
        viewerKey: `news-foundation-${author.id}`,
      },
    });
    const viewedNews = await delivery.browseShort(
      { language: 'uk', search: 'fully operational', first: 1 },
      author.id,
    );
    expect(viewedNews.items[0].engagement.viewCount).toBe(1);

    await expect(
      settings.update(publisher.id, {
        newsPaginationMode: 'BOTH',
        newsPaginationThreshold: 1,
        newsPageSize: 1,
        commentsPaginationMode: 'BOTH',
        commentsPaginationThreshold: 3,
        commentsPageSize: 3,
      }),
    ).resolves.toMatchObject({
      newsPaginationMode: 'BOTH',
      commentsPaginationMode: 'BOTH',
      commentsPaginationThreshold: 3,
    });

    const second = await news.createDraft({
      authorId: author.id,
      postType: 'STANDARD',
      visibility: 'PUBLIC',
      language: 'uk',
      slug: `station-follow-up-${suffix}`,
      title: 'Station follow-up',
      shortText: 'A second operational update for every developer.',
      documentJson: JSON.stringify(document),
      coverMediaId: `cover-second-${suffix}`,
      templateData: {},
    });
    articleIds.push(second.id);
    await workflow.submit(author.id, second.id);
    await workflow.approve(reviewer.id, second.id);
    await workflow.publish(publisher.id, second.id);

    await expect(
      delivery.browseNumbered({ page: 1, pageSize: 1, language: 'uk' }),
    ).resolves.toMatchObject({
      total: 2,
      page: 1,
      pageSize: 1,
      totalPages: 2,
      items: [{ id: second.id }],
    });
    await expect(delivery.navigation(article.id)).resolves.toMatchObject({
      previous: null,
      next: { id: second.id },
    });
    const link = await links.create(reviewer.id, {
      sourceArticleId: article.id,
      targetArticleId: second.id,
      type: 'RELATED',
      anchorText: 'Read the station follow-up',
      position: 1,
    });
    linkIds.push(link.id);
    await expect(links.list(article.id)).resolves.toMatchObject([
      {
        id: link.id,
        targetArticleId: second.id,
        target: { slug: second.slug, title: second.title },
      },
    ]);
    const fullNews = await delivery.fullBySlug('uk', article.slug, author.id);
    expect(fullNews).toMatchObject({
      id: article.id,
      engagement: {
        score: 10,
        bookmarkedByViewer: true,
        viewerReaction: 'UPVOTE',
      },
      related: [{ slug: second.slug, type: 'RELATED' }],
    });
    expect(fullNews?.documentJson).toContain('fully operational');
    const votePage = await delivery.ratingVotes(article.id, 1, 20);
    expect(votePage).toMatchObject({
      total: 2,
    });
    expect(
      new Set(
        votePage.items.map(({ kind, actor }) => `${kind}:${actor.username}`),
      ),
    ).toEqual(
      new Set([`UPVOTE:${author.username}`, `DOWNVOTE:${reviewer.username}`]),
    );
    await expect(
      prisma.newsEditorialDecision.findMany({
        where: { articleId: article.id },
        orderBy: { createdAt: 'asc' },
        select: { action: true, revisionVersion: true },
      }),
    ).resolves.toEqual([
      { action: 'SUBMITTED', revisionVersion: 2 },
      { action: 'CHANGES_REQUESTED', revisionVersion: 2 },
      { action: 'SUBMITTED', revisionVersion: 3 },
      { action: 'APPROVED', revisionVersion: 3 },
      { action: 'SCHEDULED', revisionVersion: 3 },
      { action: 'PUBLISHED', revisionVersion: 3 },
    ]);
    await expect(
      targets.authorize(
        article.interactionTargetId,
        { kind: 'AUTHENTICATED', subjectId: author.id },
        'COMMENT',
      ),
    ).resolves.toMatchObject({ allowed: true });
  });
});
