import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { createEmptyEditorDocument } from '@dss/editor';
import type { App } from 'supertest/types';

import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/core/database';
import { InteractionTargetsService } from './../src/modules/interactions';
import { NewsService } from './../src/modules/news';

describe('News domain foundation (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let news: NewsService;
  let targets: InteractionTargetsService;
  const articleIds: string[] = [];
  const userIds: string[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    news = app.get(NewsService);
    targets = app.get(InteractionTargetsService);
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
  });
});
