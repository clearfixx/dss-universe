/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Owned Mention Transaction E2E
 * 📄 File: apps/api/test/comment-mention-owned-transaction.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Proves owned recipient SQL equivalence and complete rollback at actual comment write stages.
 *
 * 🧠 Responsibilities:
 * • compares one composed SELECT with the historical combined Prisma predicate;
 * • verifies request order, lookup-time eligibility and original/transition actor evidence;
 * • injects failures only inside real migrated write transactions without authorization mocks.
 *
 * 🏗️ Architecture:
 * Real AppModule/owned disposable schema; original characterization remains separately unchanged.
 *
 * ⚠️ Important:
 * Test-only delegate hooks call real writes before throwing. No sleeps, new budgets or disabled triggers.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { createEmptyEditorDocument } from '@dss/editor';
import { PrismaService } from '@api/core/database';
import { AppModule } from '../src/app.module';
import { AuthenticationPresentationService } from '../src/composition/identity/application/authentication-presentation.service';
import { PrismaMentionRecipientResolver } from '../src/composition/comment-writes/infrastructure/prisma-mention-recipient.resolver';
import { PrismaCommentWriteTransaction } from '../src/composition/comment-writes/infrastructure/prisma-comment-write.transaction';
import { COMMENT_WRITE_TRANSACTION } from '../src/modules/interactions/contracts/comment-write-transaction.port';
import { CommentsService } from '../src/modules/interactions/application/services/comments.service';
import { NewsService } from '../src/modules/news/application/services/news.service';
import { MentionRecipientMatcher } from '../src/modules/users/infrastructure/matching/mention-recipient.matcher';
import { PrismaMentionProfileSelector } from '../src/modules/users/infrastructure/repositories/prisma-mention-profile.selector';
import { PrismaActiveSubjectSelector } from '../src/modules/auth/infrastructure/repositories/prisma-active-subject.selector';
import { EDITOR_CODE_HIGHLIGHTER } from '../src/modules/editor/application/contracts/editor-code-highlighter.interface';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

describe('Owned mention write transaction (e2e)', () => {
  let app: INestApplication;
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let prisma: PrismaService;
  let resolver: PrismaMentionRecipientResolver;
  let writes: PrismaCommentWriteTransaction;
  let author: { id: string; username: string };
  let users: { id: string; username: string }[];
  let targetId: string;
  const prefix = 't' + randomUUID().replaceAll('-', '').slice(0, 9);
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
    resolver = app.get<PrismaMentionRecipientResolver>(
      PrismaMentionRecipientResolver,
    );
    writes = app.get<PrismaCommentWriteTransaction>(COMMENT_WRITE_TRANSACTION);
    async function register(suffix: string) {
      const result = await app.get(AuthenticationPresentationService).register({
        email: `owned-mention-${randomUUID()}@dss.test`,
        username: prefix + suffix,
        displayName: 'Synthetic Owned Mention Pilot',
        password: 'synthetic-owned-mention-password-123',
      });
      return { id: result.user.id, username: result.user.username };
    }
    author = await register('Author');
    users = [];
    for (const name of [
      'Case',
      'case',
      'Fallback',
      'fallback',
      'Étoile',
      'Etoile',
      '_Pilot',
      'ZPilot',
    ])
      users.push(await register(name));
    await prisma.user.update({
      where: { id: users[2].id },
      data: { status: 'BANNED' },
    });
    const post = await app.get(NewsService).createDraft({
      authorId: author.id,
      postType: 'STANDARD',
      visibility: 'PUBLIC',
      language: 'uk',
      slug: 'owned-mentions-' + randomUUID(),
      title: 'Synthetic owned mention target',
      shortText: 'Synthetic summary',
      coverMediaId: null,
      documentJson: JSON.stringify(createEmptyEditorDocument('NEWS')),
    });
    await prisma.newsArticle.update({
      where: { id: post.id },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
    });
    targetId = post.interactionTargetId;
  }, 60000);
  afterEach(() => jest.restoreAllMocks());
  afterAll(async () => {
    await app?.close();
    await fixture?.close();
  });

  function input(names = [users[0].username]) {
    return {
      interactionTargetId: targetId,
      authorId: author.id,
      parentId: null,
      body: 'Synthetic @' + names.join(' @'),
      documentJson: JSON.stringify(createEmptyEditorDocument('COMMENT')),
      searchText: 'Synthetic mention',
      mentionedUsernames: names,
    };
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
  function historicalMatch(
    names: readonly string[],
    candidates: { id: string; username: string }[],
  ) {
    const result = new Set<string>();
    for (const name of names) {
      const matches = candidates.filter(
        (row) =>
          row.id !== author.id &&
          row.username.localeCompare(name, 'en-US', {
            sensitivity: 'accent',
          }) === 0,
      );
      const exact = matches.find((row) => row.username === name);
      if (exact) result.add(exact.id);
      else if (matches.length === 1 && matches[0]) result.add(matches[0].id);
    }
    return [...result];
  }

  it('matches the historical combined predicate and matcher across case/status/self/Unicode/wildcard/order inputs', async () => {
    const cases = [
      [],
      [prefix + 'Missing'],
      [author.username],
      [users[0].username],
      [prefix + 'cAsE'],
      [users[2].username],
      [prefix + 'étoile', prefix + 'Etoile'],
      [users[6].username],
      [
        users[1].username,
        users[0].username,
        users[1].username,
        users[6].username,
      ],
      ["x' OR 1=1 --"],
    ];
    for (const names of cases)
      await prisma.$transaction(async (transaction) => {
        // cf04110 oracle: exact old combined eligibility predicate and order, not a production fallback.
        const old = names.length
          ? await transaction.user.findMany({
              where: {
                status: 'ACTIVE',
                id: { not: author.id },
                OR: names.map((username) => ({
                  username: { equals: username, mode: 'insensitive' },
                })),
              },
              select: { id: true, username: true },
              orderBy: { id: 'asc' },
            })
          : [];
        fixture.queries.length = 0;
        expect(await resolver.resolve(transaction, names, author.id)).toEqual(
          historicalMatch(names, old),
        );
        expect(
          fixture.queries.filter((sql) => /^SELECT\b/.test(sql)),
        ).toHaveLength(names.length ? 1 : 0);
        for (const sql of fixture.queries) {
          expect(sql).not.toContain("x' OR 1=1 --");
          for (const field of [
            'passwordHash',
            'email',
            'displayName',
            'authVersion',
          ])
            expect(sql).not.toContain('"' + field + '"');
        }
      });
  });
  it('preserves requested recipient order through the actual application extraction/write path', async () => {
    const result = await app.get(CommentsService).create(author.id, targetId, {
      body: `Synthetic @${users[5].username} @${users[0].username} @${users[5].username}`,
    });
    expect(result.mentionedUserIds).toEqual([users[5].id, users[0].id]);
  });
  it('keeps account eligibility at the actual lookup point, without inventing a commit-time recheck', async () => {
    const actual = resolver.resolve.bind(
      resolver,
    ) as PrismaMentionRecipientResolver['resolve'];
    jest
      .spyOn(resolver, 'resolve')
      .mockImplementationOnce(async (transaction, names, actorId) => {
        const ids = await actual(transaction, names, actorId);
        await prisma.user.update({
          where: { id: users[0].id },
          data: { status: 'BANNED' },
        });
        return ids;
      });
    try {
      expect((await writes.create(input())).mentionedUserIds).toEqual([
        users[0].id,
      ]);
    } finally {
      await prisma.user.update({
        where: { id: users[0].id },
        data: { status: 'ACTIVE' },
      });
    }
  });
  it('does not combine an old inactive handle with a newly active renamed subject', async () => {
    const old = users[2];
    const actual = resolver.resolve.bind(
      resolver,
    ) as PrismaMentionRecipientResolver['resolve'];
    jest
      .spyOn(resolver, 'resolve')
      .mockImplementationOnce(async (transaction, names, actorId) => {
        await prisma.user.update({
          where: { id: old.id },
          data: { username: prefix + 'Fresh', status: 'ACTIVE' },
        });
        return actual(transaction, names, actorId);
      });
    try {
      expect(
        (await writes.create(input([old.username]))).mentionedUserIds,
      ).toEqual([users[3].id]);
    } finally {
      await prisma.user.update({
        where: { id: old.id },
        data: { username: old.username, status: 'BANNED' },
      });
    }
    // The only result is the genuinely ACTIVE unique case-variant fallback, never the renamed subject.
  });
  it.each(['profile', 'subject', 'matcher', 'query'] as const)(
    'rolls back target/comment/revision/evidence after %s resolution fails',
    async (stage) => {
      const before = await snapshot();
      const failure = new Error('Synthetic owned recipient failure');
      if (stage === 'profile')
        jest
          .spyOn(
            app.get<PrismaMentionProfileSelector>(PrismaMentionProfileSelector),
            'candidates',
          )
          .mockImplementation(() => {
            throw failure;
          });
      if (stage === 'subject')
        jest
          .spyOn(
            app.get<PrismaActiveSubjectSelector>(PrismaActiveSubjectSelector),
            'activeIds',
          )
          .mockImplementation(() => {
            throw failure;
          });
      if (stage === 'matcher')
        jest
          .spyOn(
            app.get<MentionRecipientMatcher>(MentionRecipientMatcher),
            'resolve',
          )
          .mockImplementation(() => {
            throw failure;
          });
      if (stage === 'query')
        jest
          .spyOn(
            app.get<PrismaMentionProfileSelector>(PrismaMentionProfileSelector),
            'candidates',
          )
          .mockReturnValue(
            Prisma.sql`SELECT missing_owned_mention_column FROM "users"`,
          );
      fixture.queries.length = 0;
      const operation = writes.create(input());
      if (stage === 'query') await expect(operation).rejects.toThrow();
      else await expect(operation).rejects.toBe(failure);
      expect(
        fixture.queries.some((sql) => /INSERT INTO .*"comments"/.test(sql)),
      ).toBe(true);
      expect(
        fixture.queries.some((sql) =>
          /INSERT INTO .*"comment_revisions"/.test(sql),
        ),
      ).toBe(true);
      expect(fixture.queries.at(-1)).toBe('ROLLBACK');
      expect(await snapshot()).toEqual(before);
    },
  );
  it.each([
    'interactionTarget',
    'comment',
    'commentRevision',
    'mention',
  ] as const)(
    'rolls back after an actual %s insert succeeds and then fails',
    async (stage) => {
      const before = await snapshot();
      const failure = new Error('Synthetic post-insert failure');
      let inserted = false;
      const run = prisma.$transaction.bind(prisma) as (
        callback: (transaction: Prisma.TransactionClient) => Promise<unknown>,
      ) => Promise<unknown>;
      const hook = (
        callback: (transaction: Prisma.TransactionClient) => Promise<unknown>,
      ) =>
        run(async (transaction) => {
          // Narrow delegate view is test-only; all SQL is the actual Prisma method before the injected error.
          const delegate = transaction[stage] as unknown as {
            create(args: unknown): Promise<unknown>;
          };
          const actual = delegate.create.bind(
            delegate,
          ) as typeof delegate.create;
          jest
            .spyOn(delegate, 'create')
            .mockImplementationOnce(async (args) => {
              await actual(args);
              inserted = true;
              throw failure;
            });
          return callback(transaction);
        });
      jest.spyOn(prisma, '$transaction').mockImplementation(hook);
      await expect(writes.create(input())).rejects.toBe(failure);
      expect(inserted).toBe(true);
      expect(await snapshot()).toEqual(before);
    },
  );
  it('retains original-author notification identity and transition-editor audit identity', async () => {
    const comment = await writes.create(input());
    const editor = users[1].id;
    await writes.edit(comment.id, editor, {
      ...input([]),
      mentionedUsernames: [],
    });
    const mention = await prisma.mention.findFirstOrThrow({
      where: { commentId: comment.id },
    });
    expect(
      await prisma.auditRecord.findFirst({
        where: { targetId: mention.id, action: 'comments.mention.retracted' },
      }),
    ).toMatchObject({ actorId: editor });
    expect(
      await prisma.outboxEvent.findFirst({
        where: {
          aggregateId: mention.id,
          eventName: 'notifications.mention.retracted.v1',
        },
      }),
    ).toMatchObject({ actorId: author.id });
  });
});
