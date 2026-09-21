import { ConflictException, type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { createEmptyEditorDocument } from '@dss/editor';
import type { App } from 'supertest/types';

import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/core/database';
import { InteractionTargetsService } from './../src/modules/interactions';
import { NewsService, NewsTaxonomyService } from './../src/modules/news';

describe('News domain foundation (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let news: NewsService;
  let targets: InteractionTargetsService;
  let taxonomy: NewsTaxonomyService;
  const articleIds: string[] = [];
  const userIds: string[] = [];
  const taxonomyIds: string[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    news = app.get(NewsService);
    targets = app.get(InteractionTargetsService);
    taxonomy = app.get(NewsTaxonomyService);
  });

  afterAll(async () => {
    if (prisma) {
      const articles = await prisma.newsArticle.findMany({
        where: { id: { in: articleIds } },
        select: { interactionTargetId: true },
      });
      const targetIds = articles.map(
        ({ interactionTargetId }) => interactionTargetId,
      );
      await prisma.newsRevision.deleteMany({
        where: { articleId: { in: articleIds } },
      });
      await prisma.newsArticle.deleteMany({
        where: { id: { in: articleIds } },
      });
      await prisma.interactionTarget.updateMany({
        where: { id: { in: targetIds } },
        data: { status: 'RETIRED' },
      });
      await prisma.auditRecord.deleteMany({
        where: {
          OR: [
            { targetType: 'NewsArticle', targetId: { in: articleIds } },
            { targetType: 'InteractionTarget', targetId: { in: targetIds } },
          ],
        },
      });
      await prisma.outboxEvent.deleteMany({
        where: {
          OR: [
            { producer: 'dss.api.news', aggregateId: { in: articleIds } },
            {
              producer: 'dss.api.interactions',
              aggregateId: { in: targetIds },
            },
          ],
        },
      });
      await prisma.newsFieldDefinition.deleteMany({
        where: { id: { in: taxonomyIds } },
      });
      await prisma.newsCategory.deleteMany({
        where: { id: { in: taxonomyIds } },
      });
      await prisma.newsTag.deleteMany({ where: { id: { in: taxonomyIds } } });
      await prisma.auditRecord.deleteMany({
        where: { targetId: { in: taxonomyIds } },
      });
      await prisma.outboxEvent.deleteMany({
        where: { producer: 'dss.api.news', aggregateId: { in: taxonomyIds } },
      });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
    if (app) await app.close();
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
      coverMediaId: null,
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
      targets.authorize(article.interactionTargetId, author.id, 'COMMENT'),
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
      coverMediaId: null,
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
        coverMediaId: null,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
