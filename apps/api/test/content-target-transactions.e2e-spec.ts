/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Content Target Transaction E2E
 * 📄 File: apps/api/test/content-target-transactions.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Verifies atomic writes and rollback at every target/content evidence stage using actual migrations.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { createEmptyEditorDocument } from '@dss/editor';
import { PrismaService } from '@api/core/database';
import { AuditWriterService } from '@api/core/audit';
import { OutboxWriterService } from '@api/core/events';
import {
  NEWS_DRAFT_TRANSACTION,
  type NewsDraftTransaction,
  type CreateNewsDraft,
} from '@api/modules/news';
import { PrismaInteractionTargetWriter } from '@api/modules/interactions/infrastructure';
import { AppModule } from '../src/app.module';
import { AuthenticationPresentationService } from '../src/composition/identity/application/authentication-presentation.service';
import { UserWallService } from '../src/modules/users/application/services/user-wall.service';
import { EDITOR_CODE_HIGHLIGHTER } from '../src/modules/editor/application/contracts/editor-code-highlighter.interface';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

describe('Content target atomic composition (e2e)', () => {
  let app: INestApplication;
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let prisma: PrismaService;
  let subjectId: string;
  let mediaId: string;
  let news: NewsDraftTransaction;
  let wall: UserWallService;
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
    await app.init();
    const authentication = app.get(AuthenticationPresentationService);
    const suffix = randomUUID();
    const identity = await authentication.register({
      email: 'target-' + suffix + '@dss.test',
      username: 'target-' + suffix,
      displayName: 'Target Pilot',
      password: 'target-boundary-fixture-123',
    });
    subjectId = identity.user.id;
    const media = await prisma.media.create({
      data: {
        ownerId: subjectId,
        kind: 'IMAGE',
        status: 'READY',
        visibility: 'PUBLIC',
        storageProvider: 'LOCAL',
        bucket: 'transaction-fixture',
        storageKey: suffix,
        originalFilename: 'fixture.webp',
        mimeType: 'image/webp',
        extension: 'webp',
        size: 100,
        checksum: suffix,
      },
    });
    mediaId = media.id;
    news = app.get<NewsDraftTransaction>(NEWS_DRAFT_TRANSACTION);
    wall = app.get(UserWallService);
  }, 60_000);
  afterAll(async () => {
    await app?.close();
    await fixture?.close();
  });
  function draft(): CreateNewsDraft {
    const document = createEmptyEditorDocument('NEWS');
    document.content.content = [
      { type: 'attachment', attrs: { mediaId, label: 'Fixture' } },
    ];
    return {
      authorId: subjectId,
      postType: 'STANDARD',
      visibility: 'PUBLIC',
      language: 'uk',
      slug: 'atomic-' + randomUUID(),
      title: 'Atomic draft',
      shortText: 'Atomic draft description',
      document,
      templateData: {},
      plainText: 'Fixture',
      searchText: 'fixture',
      coverMediaId: null,
      attachmentMediaIds: [mediaId],
    };
  }
  async function snapshot() {
    return Promise.all([
      prisma.newsArticle.count(),
      prisma.newsRevision.count(),
      prisma.userWallPost.count(),
      prisma.interactionTarget.count(),
      prisma.mediaReference.count(),
      prisma.auditRecord.count(),
      prisma.outboxEvent.count(),
    ]);
  }
  async function withInsertFailure(
    table: 'audit_records' | 'outbox_events',
    field: 'action' | 'eventName',
    value: string,
    run: () => Promise<void>,
  ) {
    // Identifiers are closed literals; the filter is test-owned, never external input.
    if (!/^[a-z0-9._-]+$/.test(value)) throw new Error('Unsafe fixture filter');
    await prisma.$executeRawUnsafe(`CREATE FUNCTION content_target_reject_insert() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF to_jsonb(NEW)->>TG_ARGV[0] = TG_ARGV[1] THEN
          RAISE EXCEPTION 'synthetic transaction evidence rejection';
        END IF;
        RETURN NEW;
      END $$`);
    try {
      await prisma.$executeRawUnsafe(`CREATE TRIGGER content_target_rejection BEFORE INSERT ON ${table}
        FOR EACH ROW EXECUTE FUNCTION content_target_reject_insert('${field}', '${value}')`);
      try {
        await run();
      } finally {
        await prisma.$executeRawUnsafe(
          `DROP TRIGGER content_target_rejection ON ${table}`,
        );
      }
    } finally {
      await prisma.$executeRawUnsafe(
        'DROP FUNCTION content_target_reject_insert()',
      );
    }
  }
  const createFailures = [
    [
      'target audit',
      'audit_records',
      'action',
      'interactions.target.registered',
    ],
    [
      'target outbox',
      'outbox_events',
      'eventName',
      'interactions.target.registered.v1',
    ],
    ['content audit', 'audit_records', 'action', 'CONTENT_AUDIT'],
    ['content outbox', 'outbox_events', 'eventName', 'CONTENT_EVENT'],
  ] as const;
  it.each(createFailures)(
    'rolls back every News creation write on %s failure',
    async (_name, table, field, key) => {
      const value =
        key === 'CONTENT_AUDIT'
          ? 'news.article.created'
          : key === 'CONTENT_EVENT'
            ? 'news.article.created.v1'
            : key;
      const before = await snapshot();
      await withInsertFailure(table, field, value, async () => {
        await expect(news.createDraft(draft())).rejects.toThrow(
          'synthetic transaction evidence rejection',
        );
      });
      expect(await snapshot()).toEqual(before);
    },
  );
  it.each(createFailures)(
    'rolls back every Wall creation write on %s failure',
    async (_name, table, field, key) => {
      const value =
        key === 'CONTENT_AUDIT'
          ? 'user.wall.post_created'
          : key === 'CONTENT_EVENT'
            ? 'users.profile-wall.post-created.v1'
            : key;
      const before = await snapshot();
      await withInsertFailure(table, field, value, async () => {
        await expect(
          wall.create(subjectId, subjectId, 'Retained wall text', mediaId),
        ).rejects.toThrow('synthetic transaction evidence rejection');
      });
      expect(await snapshot()).toEqual(before);
    },
  );
  const deletionFailures = [
    [
      'target audit',
      'audit_records',
      'action',
      'interactions.target.status_changed',
    ],
    [
      'target outbox',
      'outbox_events',
      'eventName',
      'interactions.target.status-changed.v1',
    ],
    ['content audit', 'audit_records', 'action', 'user.wall.post_deleted'],
    [
      'content outbox',
      'outbox_events',
      'eventName',
      'users.profile-wall.post-retracted.v1',
    ],
  ] as const;
  it.each(deletionFailures)(
    'rolls back Wall tombstone, target lock and reference retirement on %s failure',
    async (_name, table, field, value) => {
      const post = await wall.create(
        subjectId,
        subjectId,
        'Retained wall text',
        mediaId,
      );
      const before = await snapshot();
      await withInsertFailure(table, field, value, async () => {
        await expect(
          wall.remove(subjectId, post.id, 'Fixture deletion'),
        ).rejects.toThrow('synthetic transaction evidence rejection');
      });
      expect(await snapshot()).toEqual(before);
      expect(
        await prisma.userWallPost.findUniqueOrThrow({ where: { id: post.id } }),
      ).toMatchObject({
        body: 'Retained wall text',
        deletedAt: null,
        deletedById: null,
      });
      expect(
        await prisma.interactionTarget.findUniqueOrThrow({
          where: { id: post.interactionTargetId },
        }),
      ).toMatchObject({ status: 'ACTIVE' });
      expect(
        await prisma.mediaReference.count({
          where: { targetId: post.id, removedAt: null },
        }),
      ).toBe(1);
      const deleted = await wall.remove(subjectId, post.id, 'Fixture deletion');
      expect(deleted).toMatchObject({
        body: null,
        imageMediaId: null,
        isDeleted: true,
      });
      expect(
        await prisma.userWallPost.findUniqueOrThrow({ where: { id: post.id } }),
      ).toMatchObject({
        body: 'Retained wall text',
        deletedById: subjectId,
        deleteReason: 'Fixture deletion',
      });
      expect(
        await prisma.interactionTarget.findUniqueOrThrow({
          where: { id: post.interactionTargetId },
        }),
      ).toMatchObject({ status: 'LOCKED' });
      expect(
        await prisma.mediaReference.count({
          where: { targetId: post.id, removedAt: null },
        }),
      ).toBe(0);
    },
  );
  it.each([
    ['audit_records', 'action', 'news.article.draft_saved'],
    ['outbox_events', 'eventName', 'news.article.draft-saved.v1'],
  ] as const)(
    'rolls back News optimistic version, revision and attachment retirement on %s failure',
    async (table, field, value) => {
      const input = draft();
      const article = await news.createDraft(input);
      const before = await snapshot();
      await withInsertFailure(table, field, value, async () => {
        await expect(
          news.saveDraft({
            ...input,
            articleId: article.id,
            baseVersion: 1,
            changeSummary: 'Fixture save',
            title: 'Changed title',
            attachmentMediaIds: [],
          }),
        ).rejects.toThrow('synthetic transaction evidence rejection');
      });
      expect(await snapshot()).toEqual(before);
      expect(
        await prisma.newsArticle.findUniqueOrThrow({
          where: { id: article.id },
        }),
      ).toMatchObject({ title: input.title, currentVersion: 1 });
      expect(
        await prisma.mediaReference.count({
          where: { targetId: article.id, removedAt: null },
        }),
      ).toBe(1);
    },
  );
  it('preserves one optimistic winner and one revision/event for concurrent same-base News saves', async () => {
    const input = draft();
    const article = await news.createDraft(input);
    const results = await Promise.all(
      ['First edit', 'Second edit'].map((title) =>
        news.saveDraft({
          ...input,
          articleId: article.id,
          baseVersion: 1,
          changeSummary: title,
          title,
        }),
      ),
    );
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(results.filter((result) => result === null)).toHaveLength(1);
    expect(
      await prisma.newsRevision.count({ where: { articleId: article.id } }),
    ).toBe(2);
    expect(
      await prisma.outboxEvent.count({
        where: {
          aggregateId: article.id,
          eventName: 'news.article.draft-saved.v1',
        },
      }),
    ).toBe(1);
    expect(
      await prisma.auditRecord.count({
        where: { targetId: article.id, action: 'news.article.draft_saved' },
      }),
    ).toBe(1);
  });
  it('keeps successful target/content events and audit paired without raw document payloads', async () => {
    const input = draft();
    const article = await news.createDraft(input);
    const target = await prisma.interactionTarget.findUniqueOrThrow({
      where: { id: article.interactionTargetId },
    });
    expect(target).toMatchObject({
      kind: 'news.article',
      ownerModule: 'news',
      ownerType: 'NewsArticle',
      ownerId: article.id,
      status: 'ACTIVE',
    });
    const events = await prisma.outboxEvent.findMany({
      where: { aggregateId: { in: [article.id, target.id] } },
    });
    expect(events.map((event) => event.eventName).sort()).toEqual([
      'interactions.target.registered.v1',
      'news.article.created.v1',
    ]);
    expect(
      events.find((event) => event.eventName === 'news.article.created.v1'),
    ).toMatchObject({
      producer: 'dss.api.news',
      actorId: subjectId,
      eventCategory: 'domain',
      eventVersion: 1,
    });
    expect(
      events.find(
        (event) => event.eventName === 'interactions.target.registered.v1',
      ),
    ).toMatchObject({
      producer: 'dss.api.interactions',
      actorId: subjectId,
      eventCategory: 'integration',
      eventVersion: 1,
    });
    expect(
      events.every(
        (event) => !Object.hasOwn(event.payload as object, 'document'),
      ),
    ).toBe(true);
    expect(
      await prisma.auditRecord.count({
        where: { targetId: { in: [article.id, target.id] } },
      }),
    ).toBe(2);
  });
  it('preserves target registration/status idempotency and rejects ownership conflicts', async () => {
    const writer = new PrismaInteractionTargetWriter(
      app.get(AuditWriterService),
      app.get(OutboxWriterService),
    );
    const input = {
      id: randomUUID(),
      kind: 'fixture',
      ownerModule: 'fixture',
      ownerType: 'Fixture',
      ownerId: randomUUID(),
      actorId: subjectId,
    };
    const register = () =>
      prisma.$transaction((transaction) => writer.register(transaction, input));
    await register();
    await register();
    await expect(
      prisma.$transaction((transaction) =>
        writer.register(transaction, { ...input, kind: 'conflict' }),
      ),
    ).rejects.toThrow('Interaction target ownership conflicts.');
    for (let i = 0; i < 2; i++)
      await prisma.$transaction((transaction) =>
        writer.setStatus(
          transaction,
          input.id,
          'LOCKED',
          subjectId,
          'Fixture lock',
        ),
      );
    expect(
      await prisma.interactionTarget.count({ where: { id: input.id } }),
    ).toBe(1);
    expect(
      await prisma.auditRecord.count({ where: { targetId: input.id } }),
    ).toBe(2);
    expect(
      await prisma.outboxEvent.count({ where: { aggregateId: input.id } }),
    ).toBe(2);
  });
});
