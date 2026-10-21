/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Interaction Persistence Tests
 * 📄 File: apps/api/src/modules/interactions/infrastructure/repositories/prisma-comment.writer.spec.ts
 *
 * 🎯 Purpose:
 * Pins the transferred owned write algorithm, revision rules and stable mention transitions.
 *
 * 🧠 Responsibilities:
 * • verifies lookup ordering and create/retract/reactivate/unchanged paths;
 * • verifies tombstone mapping and read/write repository delegation;
 * • preserves original notification actor versus transition audit actor.
 *
 * 🏗️ Architecture:
 * Pure owner adapter tests; real migrated fault/concurrency E2E certifies atomic persistence.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Prisma } from '@prisma/client';
import type { PrismaService } from '@api/core/database';
import type { AuditWriterService } from '@api/core/audit';
import { PrismaCommentWriter } from './prisma-comment.writer';
import type { PrismaInteractionTargetWriter } from './prisma-interaction-target.writer';
import { PrismaCommentsRepository } from './prisma-comments.repository';
import { mapPersistedComment } from '../mappers/comment.mapper';

const row = {
  id: 'comment',
  interactionTargetId: 'article',
  reactionTargetId: 'reaction',
  authorId: 'author',
  parentId: null,
  body: 'Body',
  document: { version: 1 },
  searchText: 'Body',
  editedAt: null,
  deletedAt: null,
  createdAt: new Date(0),
  updatedAt: new Date(0),
};
const input = {
  interactionTargetId: 'article',
  authorId: 'author',
  parentId: null,
  body: 'Body',
  documentJson: '{"version":1}',
  searchText: 'Body',
  mentionedUsernames: ['Pilot'],
};
const mention = {
  id: 'mention',
  interactionTargetId: 'article',
  commentId: 'comment',
  actorId: 'author',
  recipientId: 'recipient',
  activatedAt: new Date(0),
  retractedAt: null as Date | null,
};
function harness(existing: (typeof mention)[] = []) {
  const comment = {
    create: jest.fn().mockResolvedValue(row),
    findUniqueOrThrow: jest.fn().mockResolvedValue(row),
    update: jest.fn().mockResolvedValue(row),
  };
  const revision = {
    create: jest.fn().mockResolvedValue({}),
    aggregate: jest.fn().mockResolvedValue({ _max: { version: 3 } }),
  };
  const mentions = {
    findMany: jest.fn().mockResolvedValue(existing),
    create: jest.fn().mockResolvedValue(mention),
    update: jest.fn().mockResolvedValue(mention),
  };
  const lock = jest.fn().mockResolvedValue(1);
  const transaction = {
    comment,
    commentRevision: revision,
    mention: mentions,
    $executeRaw: lock,
  } as unknown as Prisma.TransactionClient;
  const audit = jest.fn().mockResolvedValue('audit');
  const outbox = jest.fn().mockResolvedValue('event');
  const target = jest.fn().mockResolvedValue({});
  const writer = new PrismaCommentWriter(
    { append: audit } as unknown as AuditWriterService,
    { append: outbox },
    { register: target } as unknown as PrismaInteractionTargetWriter,
  );
  const resolve = jest.fn().mockResolvedValue(['recipient']);
  return {
    writer,
    transaction,
    comment,
    revision,
    mentions,
    lock,
    audit,
    outbox,
    target,
    resolve,
  };
}

describe('Owned comment writer', () => {
  it('creates target/comment/revision before resolving and appending owned mention/comment evidence', async () => {
    const h = harness();
    expect(
      await h.writer.create(h.transaction, input, h.resolve),
    ).toMatchObject({ id: 'comment', mentionedUserIds: ['recipient'] });
    expect(h.resolve).toHaveBeenCalledWith(['Pilot'], 'author');
    expect(h.target).toHaveBeenCalledWith(
      h.transaction,
      expect.objectContaining({
        kind: 'comment',
        ownerModule: 'interactions',
        ownerType: 'Comment',
        actorId: 'author',
      }),
    );
    expect(h.revision.create).toHaveBeenCalledWith({
      data: {
        commentId: 'comment',
        version: 1,
        body: 'Body',
        document: { version: 1 },
        searchText: 'Body',
        editorId: 'author',
      },
    });
    expect(h.resolve.mock.invocationCallOrder[0]).toBeGreaterThan(
      h.revision.create.mock.invocationCallOrder[0],
    );
    expect(h.resolve.mock.invocationCallOrder[0]).toBeLessThan(
      h.mentions.findMany.mock.invocationCallOrder[0],
    );
    expect(h.audit).toHaveBeenCalledTimes(2);
    expect(h.outbox).toHaveBeenCalledTimes(2);
    expect(h.audit).toHaveBeenLastCalledWith(
      h.transaction,
      expect.objectContaining({ action: 'comments.comment.created' }),
    );
  });
  it('retains the edit lock/version and resolves with original author, not editor', async () => {
    const h = harness();
    await h.writer.edit(h.transaction, 'comment', 'editor', input, h.resolve);
    expect(h.lock).toHaveBeenCalledTimes(1);
    expect(h.lock.mock.invocationCallOrder[0]).toBeLessThan(
      h.comment.findUniqueOrThrow.mock.invocationCallOrder[0],
    );
    expect(h.resolve).toHaveBeenCalledWith(['Pilot'], 'author');
    expect(h.revision.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        version: 4,
        editorId: 'editor',
      }) as unknown,
    });
    expect(h.audit).toHaveBeenCalledWith(
      h.transaction,
      expect.objectContaining({
        action: 'comments.mention.created',
        actorId: 'editor',
      }),
    );
    expect(h.outbox).toHaveBeenCalledWith(
      h.transaction,
      expect.objectContaining({
        name: 'notifications.mention.created.v1',
        actorId: 'author',
      }),
    );
  });
  it('retracts absent recipients and retains revision fallback when no prior version is present', async () => {
    const h = harness([mention]);
    h.resolve.mockResolvedValue([]);
    h.revision.aggregate.mockResolvedValue({ _max: { version: null } });
    expect(
      (
        await h.writer.edit(
          h.transaction,
          'comment',
          'editor',
          input,
          h.resolve,
        )
      ).mentionedUserIds,
    ).toEqual([]);
    expect(h.revision.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ version: 1 }) as unknown,
    });
    expect(h.mentions.update).toHaveBeenCalledWith({
      where: { id: 'mention' },
      data: { retractedAt: expect.any(Date) as Date },
    });
    expect(h.audit).toHaveBeenCalledWith(
      h.transaction,
      expect.objectContaining({ action: 'comments.mention.retracted' }),
    );
  });
  it('keeps an unchanged active mention without a second transition or duplicate recipient', async () => {
    const h = harness([mention]);
    h.resolve.mockResolvedValue(['recipient', 'recipient']);
    expect(
      (
        await h.writer.edit(
          h.transaction,
          'comment',
          'editor',
          input,
          h.resolve,
        )
      ).mentionedUserIds,
    ).toEqual(['recipient']);
    expect(h.mentions.update).not.toHaveBeenCalled();
    expect(h.mentions.create).not.toHaveBeenCalled();
    expect(h.audit).toHaveBeenCalledTimes(1);
    expect(h.outbox).toHaveBeenCalledTimes(1);
  });
  it('reactivates a retracted row with the same identity rather than creating history again', async () => {
    const h = harness([{ ...mention, retractedAt: new Date(1) }]);
    await h.writer.edit(h.transaction, 'comment', 'editor', input, h.resolve);
    expect(h.mentions.create).not.toHaveBeenCalled();
    expect(h.mentions.update).toHaveBeenCalledWith({
      where: { id: 'mention' },
      data: { activatedAt: expect.any(Date) as Date, retractedAt: null },
    });
  });
  it('redacts a tombstone and retracts mentions with no recipient resolution', async () => {
    const h = harness([mention]);
    h.comment.update.mockResolvedValue({
      ...row,
      body: null,
      document: null,
      searchText: null,
      deletedAt: new Date(2),
    });
    expect(
      await h.writer.tombstone(h.transaction, 'comment', 'moderator', 'Reason'),
    ).toMatchObject({
      body: null,
      documentJson: null,
      searchText: null,
      isDeleted: true,
      mentionedUserIds: [],
    });
    expect(h.comment.update).toHaveBeenCalledWith({
      where: { id: 'comment' },
      data: expect.objectContaining({
        document: Prisma.DbNull,
        deletedById: 'moderator',
        deleteReason: 'Reason',
      }) as unknown,
    });
    expect(h.audit).toHaveBeenLastCalledWith(
      h.transaction,
      expect.objectContaining({
        action: 'comments.comment.tombstoned',
        actorId: 'moderator',
        reason: 'Reason',
      }),
    );
  });
  it('does not re-retract already inactive mentions during a tombstone', async () => {
    const h = harness([{ ...mention, retractedAt: new Date(1) }]);
    await h.writer.tombstone(h.transaction, 'comment', 'moderator', null);
    expect(h.mentions.update).not.toHaveBeenCalled();
    expect(h.audit).toHaveBeenCalledTimes(1);
  });
});

describe('Owned comment read/write repository and mapper', () => {
  it('preserves active JSON/null and deleted projection behavior', () => {
    expect(mapPersistedComment(row)).toMatchObject({
      documentJson: '{"version":1}',
      isDeleted: false,
      mentionedUserIds: [],
    });
    expect(mapPersistedComment({ ...row, document: null })).toMatchObject({
      documentJson: null,
      body: 'Body',
    });
    expect(
      mapPersistedComment({ ...row, deletedAt: new Date(1) }),
    ).toMatchObject({ documentJson: null, body: null, searchText: null });
  });
  function repository() {
    const active = { ...row, mentions: [{ recipientId: 'recipient' }] };
    const prisma = {
      comment: {
        findUnique: jest.fn().mockResolvedValue(active),
        findMany: jest.fn().mockResolvedValue([active]),
        count: jest.fn().mockResolvedValue(1),
      },
      commentRevision: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ id: 'revision', document: { version: 1 } }]),
      },
      $transaction: jest
        .fn()
        .mockImplementation((queries: Promise<unknown>[]) =>
          Promise.all(queries),
        ),
    };
    const writes = {
      create: jest.fn().mockResolvedValue(row),
      edit: jest.fn().mockResolvedValue(row),
      tombstone: jest.fn().mockResolvedValue(row),
    };
    return {
      prisma,
      writes,
      repository: new PrismaCommentsRepository(
        prisma as unknown as PrismaService,
        writes,
      ),
    };
  }
  it('delegates all three semantic writes without creating a repository transaction', async () => {
    const h = repository();
    await h.repository.create(input);
    await h.repository.edit('comment', 'editor', input);
    await h.repository.tombstone('comment', 'editor', null);
    expect(h.writes.create).toHaveBeenCalledWith(input);
    expect(h.writes.edit).toHaveBeenCalledWith('comment', 'editor', input);
    expect(h.writes.tombstone).toHaveBeenCalledWith('comment', 'editor', null);
    expect(h.prisma.$transaction).not.toHaveBeenCalled();
  });
  it('keeps independent find/null and active mention hydration', async () => {
    const h = repository();
    expect(await h.repository.findById('comment')).toMatchObject({
      mentionedUserIds: ['recipient'],
    });
    h.prisma.comment.findUnique.mockResolvedValue(null);
    expect(await h.repository.findById('absent')).toBeNull();
  });
  it('retains numbered read-batch pagination and ordered revision JSON mapping', async () => {
    const h = repository();
    expect(await h.repository.list('article', null, 2, 3)).toMatchObject({
      page: 2,
      limit: 3,
      total: 1,
      totalPages: 1,
      items: [{ mentionedUserIds: ['recipient'] }],
    });
    expect(h.prisma.comment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 3,
        take: 3,
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      }),
    );
    expect(h.prisma.$transaction).toHaveBeenCalledWith(expect.any(Array));
    expect(await h.repository.revisions('comment')).toMatchObject([
      { documentJson: '{"version":1}' },
    ]);
  });
});
