/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Comment Mention Boundary E2E
 * 📄 File: apps/api/test/comment-mention-transaction-characterization.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Pins mention identity resolution and atomic evidence before SQL ownership transfer.
 *
 * 🧠 Responsibilities:
 * • verifies status/case/self/unknown recipient semantics using real owned use cases;
 * • checks lifecycle identity, concurrent revisions and rollback after actual evidence writes;
 * • demonstrates why split profile/eligibility reads are not equivalent to one statement.
 *
 * 🏗️ Architecture:
 * Real migrated AppModule in an owned disposable schema; no production behavior change.
 *
 * ⚠️ Important:
 * The split-read probe characterizes a rejected design, not a defect in current one-query resolution.
 * No authorization success mocks, sleeps, extended transaction budgets or weakened history triggers.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { createEmptyEditorDocument } from '@dss/editor';
import { randomUUID } from 'node:crypto';
import type { App } from 'supertest/types';
import { PrismaService } from '@api/core/database';
import { AuditWriterService } from '@api/core/audit';
import { OutboxWriterService } from '@api/core/events';
import { AppModule } from '../src/app.module';
import { AuthenticationPresentationService } from '../src/composition/identity/application/authentication-presentation.service';
import { CommentsService } from '../src/modules/interactions/application/services/comments.service';
import { NewsService } from '../src/modules/news/application/services/news.service';
import { EDITOR_CODE_HIGHLIGHTER } from '../src/modules/editor/application/contracts/editor-code-highlighter.interface';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

describe('Comment mention transaction characterization (e2e)', () => {
  let app: INestApplication<App>;
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let prisma: PrismaService;
  let comments: CommentsService;
  let author: Awaited<ReturnType<typeof register>>;
  const prefix = 'm' + randomUUID().replaceAll('-', '').slice(0, 10);
  beforeAll(async () => {
    fixture = await createIsolatedApiSchemaFixture({ captureQueries: true });
    prisma = fixture.prisma;
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(EDITOR_CODE_HIGHLIGHTER)
      .useValue({ highlight: () => Promise.resolve('') })
      .compile();
    app = module.createNestApplication();
    await app.init();
    comments = app.get(CommentsService);
    author = await register(prefix + 'Author');
  }, 60000);
  afterEach(() => jest.restoreAllMocks());
  afterAll(async () => {
    await app?.close();
    await fixture?.close();
  });
  async function register(username = prefix + randomUUID().slice(0, 8)) {
    return app.get(AuthenticationPresentationService).register({
      email: 'mention-' + randomUUID() + '@dss.test',
      username,
      displayName: 'Synthetic Mention Pilot',
      password: 'synthetic-mention-password-123',
    });
  }
  async function article() {
    const post = await app.get(NewsService).createDraft({
      authorId: author.user.id,
      postType: 'STANDARD',
      visibility: 'PUBLIC',
      language: 'uk',
      slug: 'mentions-' + randomUUID(),
      title: 'Synthetic mention target',
      shortText: 'Synthetic summary',
      coverMediaId: null,
      documentJson: JSON.stringify(createEmptyEditorDocument('NEWS')),
    });
    await prisma.newsArticle.update({
      where: { id: post.id },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
    });
    return post;
  }
  async function snapshot() {
    return {
      comments: await prisma.comment.findMany({ orderBy: { id: 'asc' } }),
      revisions: await prisma.commentRevision.findMany({
        orderBy: { id: 'asc' },
      }),
      mentions: await prisma.mention.findMany({ orderBy: { id: 'asc' } }),
      targets: await prisma.interactionTarget.count(),
      audit: await prisma.auditRecord.count(),
      outbox: await prisma.outboxEvent.count(),
    };
  }
  function userSelects() {
    return fixture.queries.filter(
      (sql) =>
        /^SELECT\b/i.test(sql) && /FROM\s+(?:"[^"]+"\.)?"users"/i.test(sql),
    );
  }

  it('resolves one current ACTIVE candidate query, excluding self/unknown and deduplicating raw spelling', async () => {
    const recipient = await register(prefix + 'Basic');
    const post = await article();
    const audit = app.get(AuditWriterService);
    const append = audit.append.bind(audit) as AuditWriterService['append'];
    const levels: string[] = [];
    jest
      .spyOn(audit, 'append')
      .mockImplementation(async (transaction, entry) => {
        if (entry.action === 'comments.mention.created') {
          const [row] = await transaction.$queryRaw<
            { transaction_isolation: string }[]
          >`SHOW transaction_isolation`;
          levels.push(row.transaction_isolation);
        }
        return append(transaction, entry);
      });
    fixture.queries.length = 0;
    const comment = await comments.create(
      author.user.id,
      post.interactionTargetId,
      {
        body: `Synthetic @${author.user.username} @${recipient.user.username} @${recipient.user.username.toUpperCase()} @${prefix}Unknown`,
      },
    );
    expect(comment.mentionedUserIds).toEqual([recipient.user.id]);
    expect(levels).toEqual(['read committed']);
    const queries = userSelects();
    expect(queries).toHaveLength(1);
    expect(queries[0]).toContain('"status"');
    expect(queries[0]).toMatch(/ILIKE/i);
    const projection = queries[0].slice(0, queries[0].indexOf(' FROM '));
    expect(projection).toContain('"id"');
    expect(projection).toContain('"username"');
    for (const field of [
      'passwordHash',
      'email',
      'status',
      'displayName',
      'authVersion',
    ])
      expect(projection).not.toContain('"' + field + '"');
  });
  it('does not query candidate profiles for a comment with no mentions', async () => {
    const post = await article();
    fixture.queries.length = 0;
    const comment = await comments.create(
      author.user.id,
      post.interactionTargetId,
      { body: 'Synthetic plain comment' },
    );
    expect(comment.mentionedUserIds).toEqual([]);
    expect(userSelects()).toEqual([]);
  });
  it.each(['BANNED', 'DEACTIVATED', 'DELETED'] as const)(
    'excludes %s recipients',
    async (status) => {
      const recipient = await register();
      const post = await article();
      await prisma.user.update({
        where: { id: recipient.user.id },
        data: { status },
      });
      expect(
        (
          await comments.create(author.user.id, post.interactionTargetId, {
            body: 'Synthetic @' + recipient.user.username,
          })
        ).mentionedUserIds,
      ).toEqual([]);
    },
  );
  it('selects exact spelling among two ACTIVE case variants and rejects ambiguous spelling', async () => {
    const upper = await register(prefix + 'Case');
    const lower = await register(prefix + 'case');
    const post = await article();
    expect(
      (
        await comments.create(author.user.id, post.interactionTargetId, {
          body: 'Synthetic @' + upper.user.username,
        })
      ).mentionedUserIds,
    ).toEqual([upper.user.id]);
    expect(
      (
        await comments.create(author.user.id, post.interactionTargetId, {
          body: 'Synthetic @' + lower.user.username,
        })
      ).mentionedUserIds,
    ).toEqual([lower.user.id]);
    expect(
      (
        await comments.create(author.user.id, post.interactionTargetId, {
          body: 'Synthetic @' + prefix + 'cAsE',
        })
      ).mentionedUserIds,
    ).toEqual([]);
  });
  it('filters inactive exact matches before deciding uniqueness of an ACTIVE case-insensitive fallback', async () => {
    const active = await register(prefix + 'Fallback');
    const inactive = await register(prefix + 'fallback');
    const post = await article();
    await prisma.user.update({
      where: { id: inactive.user.id },
      data: { status: 'BANNED' },
    });
    expect(
      (
        await comments.create(author.user.id, post.interactionTargetId, {
          body: 'Synthetic @' + inactive.user.username,
        })
      ).mentionedUserIds,
    ).toEqual([active.user.id]);
  });
  it('excludes the author before case-insensitive fallback/ambiguity resolution', async () => {
    const counterpart = await register(author.user.username.toLowerCase());
    const post = await article();
    expect(
      (
        await comments.create(author.user.id, post.interactionTargetId, {
          body: 'Synthetic @' + author.user.username,
        })
      ).mentionedUserIds,
    ).toEqual([counterpart.user.id]);
  });
  it('does not treat underscore SQL wildcard candidates as literal matching handles', async () => {
    const literal = await register(prefix + '_Pilot');
    const other = await register(prefix + 'ZPilot');
    const post = await article();
    const result = await comments.create(
      author.user.id,
      post.interactionTargetId,
      { body: 'Synthetic @' + literal.user.username },
    );
    expect(result.mentionedUserIds).toEqual([literal.user.id]);
    expect(result.mentionedUserIds).not.toContain(other.user.id);
  });
  it('preserves Unicode case and accent-sensitive fallback for persisted handles', async () => {
    const accented = await register(prefix + 'Étoile');
    const unaccented = await register(prefix + 'Etoile');
    const post = await article();
    expect(
      (
        await comments.create(author.user.id, post.interactionTargetId, {
          body: 'Synthetic @' + prefix + 'étoile',
        })
      ).mentionedUserIds,
    ).toEqual([accented.user.id]);
    expect(
      (
        await comments.create(author.user.id, post.interactionTargetId, {
          body: 'Synthetic @' + prefix + 'etoile',
        })
      ).mentionedUserIds,
    ).toEqual([unaccented.user.id]);
  });
  it('preserves mention identity through unchanged edit, retraction, reactivation and tombstone evidence', async () => {
    const first = await register();
    const second = await register();
    const post = await article();
    const comment = await comments.create(
      author.user.id,
      post.interactionTargetId,
      { body: 'Synthetic @' + first.user.username },
    );
    const original = await prisma.mention.findFirstOrThrow({
      where: { commentId: comment.id, recipientId: first.user.id },
    });
    await comments.edit(author.user.id, comment.id, {
      body: 'Synthetic again @' + first.user.username,
    });
    expect(
      await prisma.mention.count({ where: { commentId: comment.id } }),
    ).toBe(1);
    await comments.edit(author.user.id, comment.id, {
      body: 'Synthetic @' + second.user.username,
    });
    expect(
      (await prisma.mention.findUniqueOrThrow({ where: { id: original.id } }))
        .retractedAt,
    ).not.toBeNull();
    await comments.edit(author.user.id, comment.id, {
      body: 'Synthetic @' + first.user.username,
    });
    const reactivated = await prisma.mention.findUniqueOrThrow({
      where: { id: original.id },
    });
    expect(reactivated.createdAt).toEqual(original.createdAt);
    expect(reactivated.activatedAt.getTime()).toBeGreaterThanOrEqual(
      original.activatedAt.getTime(),
    );
    expect(reactivated.retractedAt).toBeNull();
    const deleted = await comments.remove(
      author.user.id,
      comment.id,
      'Synthetic removal',
    );
    expect(deleted).toMatchObject({
      body: null,
      documentJson: null,
      searchText: null,
      isDeleted: true,
      mentionedUserIds: [],
    });
    expect(
      await prisma.mention.count({
        where: { commentId: comment.id, retractedAt: null },
      }),
    ).toBe(0);
    expect(
      await prisma.mention.count({ where: { commentId: comment.id } }),
    ).toBe(2);
    expect(
      (
        await prisma.commentRevision.findMany({
          where: { commentId: comment.id },
          orderBy: { version: 'asc' },
        })
      ).map(({ version }) => version),
    ).toEqual([1, 2, 3, 4]);
    const ids = (
      await prisma.mention.findMany({
        where: { commentId: comment.id },
        select: { id: true },
      })
    ).map(({ id }) => id);
    const events = await prisma.outboxEvent.findMany({
      where: { aggregateType: 'Mention', aggregateId: { in: ids } },
      orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }],
    });
    expect(
      events.filter(
        ({ eventName }) => eventName === 'notifications.mention.created.v1',
      ),
    ).toHaveLength(3);
    expect(
      events.filter(
        ({ eventName }) => eventName === 'notifications.mention.retracted.v1',
      ),
    ).toHaveLength(3);
    for (const event of events) {
      expect(event).toMatchObject({
        producer: 'dss.api.comments',
        eventVersion: 1,
        eventCategory: 'integration',
        actorId: author.user.id,
      });
      expect(
        Object.keys(event.payload as Record<string, unknown>).sort(),
      ).toEqual([
        'actorId',
        'commentId',
        'interactionTargetId',
        'mentionId',
        'recipientId',
      ]);
    }
    expect(
      await prisma.auditRecord.count({
        where: { targetType: 'Mention', targetId: { in: ids } },
      }),
    ).toBe(6);
  });
  it('serializes concurrent edit revisions and leaves active mentions consistent with the final body', async () => {
    const first = await register();
    const second = await register();
    const post = await article();
    const comment = await comments.create(
      author.user.id,
      post.interactionTargetId,
      { body: 'Synthetic initial' },
    );
    const bodies = [
      'Synthetic @' + first.user.username,
      'Synthetic @' + second.user.username,
    ];
    await Promise.all(
      bodies.map((body) => comments.edit(author.user.id, comment.id, { body })),
    );
    const revisions = await prisma.commentRevision.findMany({
      where: { commentId: comment.id },
      orderBy: { version: 'asc' },
    });
    expect(revisions.map(({ version }) => version)).toEqual([1, 2, 3]);
    expect(new Set(revisions.slice(1).map(({ body }) => body))).toEqual(
      new Set(bodies),
    );
    const stored = await prisma.comment.findUniqueOrThrow({
      where: { id: comment.id },
    });
    expect(stored.body).toBe(revisions[2].body);
    const expected = stored.body === bodies[0] ? first.user.id : second.user.id;
    expect(
      (
        await prisma.mention.findMany({
          where: { commentId: comment.id, retractedAt: null },
          select: { recipientId: true },
        })
      ).map(({ recipientId }) => recipientId),
    ).toEqual([expected]);
  });
  it('rolls back target/comment/revision/mention and all evidence after a real mention audit write fails', async () => {
    const recipient = await register();
    const post = await article();
    const before = await snapshot();
    const audit = app.get(AuditWriterService);
    const actual = audit.append.bind(audit) as AuditWriterService['append'];
    const failure = new Error('Synthetic mention audit failure');
    jest
      .spyOn(audit, 'append')
      .mockImplementation(async (transaction, entry) => {
        const id = await actual(transaction, entry);
        if (entry.action === 'comments.mention.created') throw failure;
        return id;
      });
    await expect(
      comments.create(author.user.id, post.interactionTargetId, {
        body: 'Synthetic @' + recipient.user.username,
      }),
    ).rejects.toBe(failure);
    expect(await snapshot()).toEqual(before);
  });
  it('rolls back edit/revision/retraction and evidence after a real mention outbox write fails', async () => {
    const recipient = await register();
    const post = await article();
    const comment = await comments.create(
      author.user.id,
      post.interactionTargetId,
      { body: 'Synthetic @' + recipient.user.username },
    );
    const before = await snapshot();
    const outbox = app.get(OutboxWriterService);
    const actual = outbox.append.bind(outbox) as OutboxWriterService['append'];
    const failure = new Error('Synthetic mention outbox failure');
    jest
      .spyOn(outbox, 'append')
      .mockImplementation(async (transaction, event) => {
        const id = await actual(transaction, event);
        if (event.name === 'notifications.mention.retracted.v1') throw failure;
        return id;
      });
    await expect(
      comments.edit(author.user.id, comment.id, {
        body: 'Synthetic no mention',
      }),
    ).rejects.toBe(failure);
    expect(await snapshot()).toEqual(before);
  });
  it('rolls back tombstone/redaction/retraction after a real mention audit write fails', async () => {
    const recipient = await register();
    const post = await article();
    const comment = await comments.create(
      author.user.id,
      post.interactionTargetId,
      { body: 'Synthetic @' + recipient.user.username },
    );
    const before = await snapshot();
    const audit = app.get(AuditWriterService);
    const actual = audit.append.bind(audit) as AuditWriterService['append'];
    const failure = new Error('Synthetic tombstone mention failure');
    jest
      .spyOn(audit, 'append')
      .mockImplementation(async (transaction, entry) => {
        const id = await actual(transaction, entry);
        if (entry.action === 'comments.mention.retracted') throw failure;
        return id;
      });
    await expect(
      comments.remove(author.user.id, comment.id, 'Synthetic reason'),
    ).rejects.toBe(failure);
    expect(await snapshot()).toEqual(before);
  });
  it('demonstrates a false-positive recipient from split Read Committed profile/eligibility reads across an atomic rename/activation', async () => {
    const recipient = await register();
    const oldName = recipient.user.username;
    await prisma.user.update({
      where: { id: recipient.user.id },
      data: { status: 'BANNED' },
    });
    const evidence = await prisma.$transaction(
      async (transaction) => {
        const where = {
          username: { equals: oldName, mode: 'insensitive' as const },
        };
        const combinedBefore = await transaction.user.findMany({
          where: { ...where, status: 'ACTIVE' },
          select: { id: true },
        });
        const profiles = await transaction.user.findMany({
          where,
          select: { id: true, username: true },
        });
        // One independent commit changes both facts. Neither committed state matches the old handle AND ACTIVE.
        await prisma.user.update({
          where: { id: recipient.user.id },
          data: { username: prefix + 'Renamed', status: 'ACTIVE' },
        });
        const active = await transaction.user.findMany({
          where: { id: { in: profiles.map(({ id }) => id) }, status: 'ACTIVE' },
          select: { id: true },
        });
        const combinedAfter = await transaction.user.findMany({
          where: { ...where, status: 'ACTIVE' },
          select: { id: true },
        });
        return { combinedBefore, profiles, active, combinedAfter };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );
    expect(evidence.combinedBefore).toEqual([]);
    expect(evidence.combinedAfter).toEqual([]);
    expect(evidence.profiles.map(({ id }) => id)).toEqual([recipient.user.id]);
    expect(evidence.active.map(({ id }) => id)).toEqual([recipient.user.id]);
  });
});
