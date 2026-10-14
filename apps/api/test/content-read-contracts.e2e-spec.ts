/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Content Read E2E
 * 📄 File: apps/api/test/content-read-contracts.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Verifies minimal Media evidence and privacy-aware Activity reads using real owner services and PostgreSQL.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { randomUUID } from 'node:crypto';
import { createEmptyEditorDocument } from '@dss/editor';
import { PrismaService } from '@api/core/database';
import {
  MEDIA_PUBLICATION_EVIDENCE,
  type MediaPublicationEvidenceReader,
} from '@api/modules/media';
import {
  ACTOR_ACTIVITY_READER,
  type ActorActivityReader,
} from '@api/modules/activity';
import { AppModule } from '../src/app.module';
import { AuthenticationPresentationService } from '../src/composition/identity/application/authentication-presentation.service';
import { NewsService } from '../src/modules/news/application/services/news.service';
import { NewsWorkflowService } from '../src/modules/news/application/services/news-workflow.service';
import { UserActivityFeedService } from '../src/modules/users/application/services/user-activity-feed.service';
import { UserBlockService } from '../src/modules/users/application/services/user-block.service';
import { EDITOR_CODE_HIGHLIGHTER } from '../src/modules/editor/application/contracts/editor-code-highlighter.interface';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

describe('Content read contracts composed with PostgreSQL (e2e)', () => {
  let app: INestApplication<App>;
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let prisma: PrismaService;
  let owner: Awaited<ReturnType<typeof register>>;
  let viewer: Awaited<ReturnType<typeof register>>;
  let news: NewsService;
  beforeAll(async () => {
    fixture = await createIsolatedApiSchemaFixture();
    prisma = fixture.prisma;
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(EDITOR_CODE_HIGHLIGHTER)
      .useValue({ highlight: () => Promise.resolve('') })
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
    owner = await register();
    viewer = await register();
    news = app.get(NewsService);
  }, 60_000);
  afterAll(async () => {
    jest.restoreAllMocks();
    await app?.close();
    await fixture?.close();
  });
  async function register() {
    const suffix = randomUUID();
    const authentication = app.get(AuthenticationPresentationService);
    return authentication.register({
      email: 'read-' + suffix + '@dss.test',
      username: 'read-' + suffix,
      displayName: 'Read Pilot',
      password: 'read-boundary-fixture-123',
    });
  }
  async function media(
    ownerId: string | null,
    status: 'READY' | 'PROCESSING' | 'REJECTED',
    visibility: 'PUBLIC' | 'PRIVATE',
  ) {
    const suffix = randomUUID();
    return prisma.media.create({
      data: {
        ownerId,
        status,
        visibility,
        kind: 'IMAGE',
        storageProvider: 'LOCAL',
        bucket: 'read-fixture',
        storageKey: suffix,
        originalFilename: 'private-fixture.webp',
        mimeType: 'image/webp',
        extension: 'webp',
        size: 100,
        checksum: suffix,
        metadata: { private: 'must not cross read contract' },
      },
    });
  }
  function input(mediaId: string) {
    const document = createEmptyEditorDocument('NEWS');
    document.content.content = [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Real publication content.' }],
      },
      { type: 'attachment', attrs: { mediaId, label: 'Fixture' } },
    ];
    return {
      authorId: owner.user.id,
      postType: 'STANDARD' as const,
      visibility: 'PUBLIC' as const,
      language: 'uk',
      slug: 'read-' + randomUUID(),
      title: 'Read boundary fixture',
      shortText: 'Read boundary fixture description',
      documentJson: JSON.stringify(document),
      coverMediaId: mediaId,
    };
  }
  it('publishes exactly three Media facts, including nullable system ownership', async () => {
    const asset = await media(null, 'READY', 'PUBLIC');
    const reader = app.get<MediaPublicationEvidenceReader>(
      MEDIA_PUBLICATION_EVIDENCE,
    );
    expect(await reader.findById(asset.id)).toEqual({
      ownerId: null,
      isPublic: true,
      isReady: true,
    });
    expect(await reader.findById(randomUUID())).toBeNull();
  });
  it.each([
    ['owned private non-ready', true, 'PROCESSING', 'PRIVATE'],
    ['foreign public non-ready', false, 'REJECTED', 'PUBLIC'],
  ] as const)(
    'preserves the existing draft access rule for %s assets',
    async (_label, owned, status, visibility) => {
      const asset = await media(
        owned ? owner.user.id : viewer.user.id,
        status,
        visibility,
      );
      const article = await news.createDraft(input(asset.id));
      expect(article.status).toBe('DRAFT');
      expect(
        await prisma.mediaReference.count({
          where: { targetId: article.id, mediaId: asset.id, removedAt: null },
        }),
      ).toBe(1);
    },
  );
  it('denies missing/foreign-private attachments before draft persistence', async () => {
    const asset = await media(viewer.user.id, 'READY', 'PRIVATE');
    const before = await prisma.newsArticle.count();
    for (const id of [asset.id, randomUUID()])
      await expect(news.createDraft(input(id))).rejects.toThrow(
        'News attachment is unavailable to this author.',
      );
    expect(await prisma.newsArticle.count()).toBe(before);
  });
  it.each([
    ['non-ready public', 'PROCESSING', 'PUBLIC'],
    ['ready private', 'READY', 'PRIVATE'],
  ] as const)(
    'keeps review stricter than draft access for %s attachments',
    async (_label, status, visibility) => {
      const asset = await media(owner.user.id, status, visibility);
      const article = await news.createDraft(input(asset.id));
      await expect(
        app.get(NewsWorkflowService).submit(owner.user.id, article.id),
      ).rejects.toThrow('Every News attachment must be ready');
      expect(
        await prisma.newsArticle.findUniqueOrThrow({
          where: { id: article.id },
        }),
      ).toMatchObject({ status: 'DRAFT' });
    },
  );
  it('submits ready public attachments through the real editorial transition', async () => {
    const asset = await media(owner.user.id, 'READY', 'PUBLIC');
    const article = await news.createDraft(input(asset.id));
    expect(
      (await app.get(NewsWorkflowService).submit(owner.user.id, article.id))
        .article.status,
    ).toBe('IN_REVIEW');
  });
  async function seedActivity(actorId: string) {
    const entries: Array<{ id: string }> = [];
    for (const [visibility, retracted] of [
      ['PUBLIC', false],
      ['MEMBERS', false],
      ['PRIVATE', false],
      ['PUBLIC', true],
    ] as const) {
      entries.push(
        await prisma.activityEntry.create({
          data: {
            actorId,
            sourceEventId: randomUUID(),
            module: 'NEWS',
            action: 'published',
            subjectType: 'NewsArticle',
            subjectId: randomUUID(),
            visibility,
            metadata: { secret: 'synthetic-private-metadata' },
            occurredAt: new Date(),
            retractedAt: retracted ? new Date() : null,
          },
        }),
      );
    }
    return entries;
  }
  async function activity(token: string, actorId: string) {
    const response = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', 'Bearer ' + token)
      .send({
        query:
          'query($userId: ID!) { userActivity(userId: $userId) { total items { id actorId module action subjectId subjectType occurredAt } } }',
        variables: { userId: actorId },
      })
      .expect(200);
    return response.body as {
      data: {
        userActivity: {
          total: number;
          items: Array<{ id: string; occurredAt: string }>;
        };
      } | null;
      errors?: unknown[];
    };
  }
  it('keeps PUBLIC/MEMBERS non-retracted filtering, pagination and GraphQL timestamp format', async () => {
    const subject = await register();
    const entries = await seedActivity(subject.user.id);
    const reader = app.get<ActorActivityReader>(ACTOR_ACTIVITY_READER);
    const page = await reader.byActor(subject.user.id, -1, 100);
    expect(page).toMatchObject({ total: 2, page: 1, limit: 50, totalPages: 1 });
    expect(page.items.map((entry) => entry.id).sort()).toEqual(
      entries
        .slice(0, 2)
        .map((entry) => entry.id)
        .sort(),
    );
    expect(Object.keys(page.items[0]).sort()).toEqual([
      'action',
      'actorId',
      'id',
      'module',
      'occurredAt',
      'subjectId',
      'subjectType',
    ]);
    expect(JSON.stringify(page)).not.toContain('synthetic-private-metadata');
    const response = await activity(viewer.tokens.accessToken, subject.user.id);
    expect(response.errors).toBeUndefined();
    expect(response.data!.userActivity.total).toBe(2);
    expect(
      response.data!.userActivity.items.every((entry) =>
        entry.occurredAt.endsWith('Z'),
      ),
    ).toBe(true);
  });
  it('denies private-profile activity before reading the projection and retains owner access', async () => {
    const subject = await register();
    await seedActivity(subject.user.id);
    await prisma.userPrivacySettings.create({
      data: { userId: subject.user.id, profileVisibility: 'PRIVATE' },
    });
    const spy = jest.spyOn(
      app.get<ActorActivityReader>(ACTOR_ACTIVITY_READER),
      'byActor',
    );
    try {
      const denied = await activity(viewer.tokens.accessToken, subject.user.id);
      expect(denied.errors).toBeDefined();
      expect(denied.data).toBeNull();
      expect(spy.mock.calls).toHaveLength(0);
      expect(
        (await activity(subject.tokens.accessToken, subject.user.id)).data!
          .userActivity.total,
      ).toBe(2);
    } finally {
      spy.mockRestore();
    }
  });
  it('preserves activity blocking in both directions', async () => {
    const subject = await register();
    const blocks = app.get(UserBlockService);
    for (const [actor, recipient] of [
      [subject.user.id, viewer.user.id],
      [viewer.user.id, subject.user.id],
    ]) {
      await blocks.block(actor, recipient);
      try {
        await expect(
          app
            .get(UserActivityFeedService)
            .list(viewer.user.id, subject.user.id),
        ).rejects.toThrow('User activity access is blocked.');
      } finally {
        await blocks.unblock(actor, recipient);
      }
    }
  });
  it('honors activity retraction on the next read', async () => {
    const subject = await register();
    const entries = await seedActivity(subject.user.id);
    const reader = app.get<ActorActivityReader>(ACTOR_ACTIVITY_READER);
    expect((await reader.byActor(subject.user.id)).total).toBe(2);
    await prisma.activityEntry.update({
      where: { id: entries[0].id },
      data: { retractedAt: new Date() },
    });
    expect((await reader.byActor(subject.user.id)).total).toBe(1);
  });
  it('propagates Media and Activity provider errors without successful fallback data', async () => {
    const before = await prisma.newsArticle.count();
    const mediaSpy = jest
      .spyOn(
        app.get<MediaPublicationEvidenceReader>(MEDIA_PUBLICATION_EVIDENCE),
        'findById',
      )
      .mockRejectedValue(new Error('Synthetic Media unavailable'));
    try {
      await expect(news.createDraft(input(randomUUID()))).rejects.toThrow(
        'Synthetic Media unavailable',
      );
    } finally {
      mediaSpy.mockRestore();
    }
    expect(await prisma.newsArticle.count()).toBe(before);
    const activitySpy = jest
      .spyOn(app.get<ActorActivityReader>(ACTOR_ACTIVITY_READER), 'byActor')
      .mockRejectedValue(new Error('Synthetic Activity unavailable'));
    try {
      const response = await activity(viewer.tokens.accessToken, owner.user.id);
      expect(response.errors).toBeDefined();
      expect(response.data).toBeNull();
    } finally {
      activitySpy.mockRestore();
    }
  });
});
