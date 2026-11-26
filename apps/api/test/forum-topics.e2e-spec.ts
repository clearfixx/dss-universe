/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Forum (Community Hub)
 * 📄 File: apps/api/test/forum-topics.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Verifies CH-1a topics and posts against migrated PostgreSQL.
 *
 * ⚠️ Important:
 * Uses an isolated schema in the disposable dss_test database only.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { randomUUID } from 'node:crypto';
import { createEmptyEditorDocument } from '@dss/editor';
import { AuditRedactionService, AuditWriterService } from '@api/core/audit';
import { OutboxWriterService } from '@api/core/events';
import type { EditorDocumentNormalizer } from '@api/modules/editor';
import type { ForumViewerFacts } from '@api/modules/forum';
import { ForumStructureService } from '@api/modules/forum/infrastructure/prisma-forum-structure';
import { ForumTopicsService } from '@api/modules/forum/infrastructure/prisma-forum-topics';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

describe('Forum topics and posts (e2e)', () => {
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let structure: ForumStructureService;
  let topics: ForumTopicsService;
  const facts = new Map<string, Partial<ForumViewerFacts>>();
  const gated = 'GATED';

  beforeAll(async () => {
    fixture = await createIsolatedApiSchemaFixture();
    const viewers = {
      read: (subjectId: string | null) =>
        Promise.resolve({
          subjectId,
          audienceKeys: [],
          seesAllCategories: false,
          moderatesAllCategories: false,
          canAssignModerators: false,
          canPurgeContent: false,
          ...(subjectId ? facts.get(subjectId) : {}),
        }),
    };
    const audit = new AuditWriterService(new AuditRedactionService());
    const outbox = new OutboxWriterService();
    const normalize = (json: string) => {
      const document =
        json === gated
          ? {
              ...createEmptyEditorDocument('FORUM_TOPIC'),
              content: [{ type: 'contentGate', attrs: { gateId: 'g' } }],
            }
          : createEmptyEditorDocument('FORUM_REPLY');
      return {
        document,
        canonicalJson: JSON.stringify(document),
        plainText: json === '' ? '' : 'Text ' + json,
        searchText: 'text',
      } as ReturnType<EditorDocumentNormalizer['normalizeForumReply']>;
    };
    const editor = {
      normalizeNews: jest.fn(),
      normalizeComment: jest.fn(),
      normalizeWiki: jest.fn(),
      normalizeForumTopic: normalize,
      normalizeForumReply: normalize,
    } as unknown as EditorDocumentNormalizer;
    structure = new ForumStructureService(
      fixture.prisma,
      audit,
      outbox,
      viewers,
    );
    topics = new ForumTopicsService(
      fixture.prisma,
      audit,
      outbox,
      viewers,
      editor,
      structure,
      {
        project: (documentJson) => Promise.resolve({ documentJson, gates: [] }),
      },
      { project: (documentJson) => Promise.resolve({ documentJson }) },
    );
  }, 60000);

  afterAll(async () => {
    await fixture?.close();
  });

  async function user(viewer: Partial<ForumViewerFacts> = {}) {
    const id = randomUUID();
    await fixture.prisma.user.create({
      data: {
        id,
        email: `topic-${id}@dss.test`,
        username: `topic-${id}`,
        passwordHash: 'fixture-hash',
      },
    });
    facts.set(id, viewer);
    return id;
  }

  async function forum(
    visibility: 'PUBLIC' | 'RESTRICTED' = 'PUBLIC',
    audienceKeys: string[] = [],
  ) {
    const admin = await user({
      seesAllCategories: true,
      canAssignModerators: true,
    });
    const slug = 'c-' + randomUUID().slice(0, 8);
    const category = await structure.createCategory(admin, {
      slug,
      title: 'Category',
      description: null,
      position: 0,
      visibility,
      audienceKeys,
      active: true,
    });
    const created = await structure.createForum(admin, {
      categoryId: category.id,
      parentId: null,
      slug: 'general',
      title: 'General',
      description: null,
      position: 0,
      allowsGatedContent: false,
      active: true,
    });
    return { forumId: created.id, categoryId: category.id, admin };
  }

  async function aged(userId: string) {
    // Move the cooldown into the past instead of sleeping in tests.
    await fixture.prisma.forumPostingCooldown.updateMany({
      where: { userId },
      data: { lastPostAt: new Date(Date.now() - 61_000) },
    });
  }

  it('creates a topic with post #1, revision 1, target and events', async () => {
    const { forumId } = await forum();
    const author = await user();
    const { topic, firstPostId } = await topics.createTopic(author, {
      forumId,
      kind: 'QUESTION',
      title: '  How do   I start? ',
      documentJson: 'first',
    });
    expect(topic).toMatchObject({
      title: 'How do I start?',
      kind: 'QUESTION',
      state: 'OPEN',
      postCount: 1,
      lastPostNumber: 1,
    });
    await expect(
      fixture.prisma.interactionTarget.findUniqueOrThrow({
        where: { id: topic.interactionTargetId },
      }),
    ).resolves.toMatchObject({ kind: 'forum.topic', ownerId: topic.id });
    await expect(
      fixture.prisma.forumPostRevision.count({
        where: { postId: firstPostId },
      }),
    ).resolves.toBe(1);
    await expect(
      fixture.prisma.outboxEvent.count({
        where: { eventName: 'forum.topic.created.v1', aggregateId: topic.id },
      }),
    ).resolves.toBe(1);
  });

  it('numbers concurrent replies without gaps and updates counters', async () => {
    const { forumId } = await forum();
    const author = await user();
    const { topic } = await topics.createTopic(author, {
      forumId,
      kind: 'DISCUSSION',
      title: 'Numbering',
      documentJson: 'first',
    });
    const repliers = await Promise.all(Array.from({ length: 5 }, () => user()));
    const posts = await Promise.all(
      repliers.map((id) =>
        topics.reply(id, {
          topicId: topic.id,
          documentJson: 'reply',
          replyToNumber: 1,
          quotedNumbers: [],
        }),
      ),
    );
    expect(posts.map(({ number }) => number).sort()).toEqual([2, 3, 4, 5, 6]);
    await expect(topics.topic(null, topic.id)).resolves.toMatchObject({
      postCount: 6,
      lastPostNumber: 6,
    });
    const page = await topics.posts(null, topic.id, 1, 50);
    expect(page.items.map(({ number }) => number)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('enforces the 60-second cooldown for members but not moderators', async () => {
    const { forumId, categoryId, admin } = await forum();
    const member = await user();
    const { topic } = await topics.createTopic(member, {
      forumId,
      kind: 'DISCUSSION',
      title: 'Cooldown',
      documentJson: 'first',
    });
    await expect(
      topics.reply(member, {
        topicId: topic.id,
        documentJson: 'too soon',
        replyToNumber: null,
        quotedNumbers: [],
      }),
    ).rejects.toMatchObject({ code: 'RATE_LIMITED' });
    await aged(member);
    await expect(
      topics.reply(member, {
        topicId: topic.id,
        documentJson: 'later',
        replyToNumber: null,
        quotedNumbers: [],
      }),
    ).resolves.toMatchObject({ number: 2 });

    const moderator = await user();
    await structure.assignModerator(admin, categoryId, moderator);
    for (let i = 0; i < 3; i += 1) {
      await topics.reply(moderator, {
        topicId: topic.id,
        documentJson: 'notice ' + i,
        replyToNumber: null,
        quotedNumbers: [],
      });
    }
  });

  it('applies edit windows, revisions and compare-and-swap', async () => {
    const { forumId } = await forum();
    const author = await user();
    const other = await user();
    const { topic, firstPostId } = await topics.createTopic(author, {
      forumId,
      kind: 'DISCUSSION',
      title: 'Editing',
      documentJson: 'first',
    });
    const edited = await topics.editPost(author, {
      postId: firstPostId,
      expectedRevision: 1,
      documentJson: 'first v2',
      title: 'Editing, updated',
    });
    expect(edited.revision).toBe(2);
    await expect(topics.topic(null, topic.id)).resolves.toMatchObject({
      title: 'Editing, updated',
    });
    await expect(
      topics.editPost(author, {
        postId: firstPostId,
        expectedRevision: 1,
        documentJson: 'stale',
      }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
    await expect(
      topics.editPost(other, {
        postId: firstPostId,
        expectedRevision: 2,
        documentJson: 'not mine',
      }),
    ).rejects.toMatchObject({ code: 'ACCESS_DENIED' });

    await aged(other);
    const reply = await topics.reply(other, {
      topicId: topic.id,
      documentJson: 'reply',
      replyToNumber: null,
      quotedNumbers: [1],
    });
    await fixture.prisma.forumPost.update({
      where: { id: reply.id },
      data: { createdAt: new Date(Date.now() - 11 * 60_000) },
    });
    await expect(
      topics.editPost(other, {
        postId: reply.id,
        expectedRevision: 1,
        documentJson: 'too late',
      }),
    ).rejects.toMatchObject({ code: 'ACCESS_DENIED' });

    await fixture.prisma.forumTopic.update({
      where: { id: topic.id },
      data: { curatorId: other },
    });
    await expect(
      topics.editPost(author, {
        postId: firstPostId,
        expectedRevision: 2,
        documentJson: 'after curator',
      }),
    ).rejects.toMatchObject({ code: 'ACCESS_DENIED' });
    await expect(topics.revisions(null, firstPostId)).resolves.toHaveLength(2);
    await expect(
      fixture.prisma.forumPostRevision.updateMany({
        where: { postId: firstPostId },
        data: { plainText: 'rewrite' },
      }),
    ).rejects.toThrow();
  });

  it('lets the author close but only moderators reopen; closed topics reject replies', async () => {
    const { forumId, categoryId, admin } = await forum();
    const author = await user();
    const { topic } = await topics.createTopic(author, {
      forumId,
      kind: 'DISCUSSION',
      title: 'Lifecycle',
      documentJson: 'first',
    });
    await topics.closeTopic(author, topic.id);
    await expect(topics.reopenTopic(author, topic.id)).rejects.toMatchObject({
      code: 'ACCESS_DENIED',
    });
    await aged(author);
    await expect(
      topics.reply(author, {
        topicId: topic.id,
        documentJson: 'closed',
        replyToNumber: null,
        quotedNumbers: [],
      }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
    await expect(
      topics.permits(topic.id, topic.interactionTargetId, author, 'REACT'),
    ).resolves.toBe(false);
    const moderator = await user();
    await structure.assignModerator(admin, categoryId, moderator);
    await expect(
      topics.reopenTopic(moderator, topic.id),
    ).resolves.toMatchObject({ state: 'OPEN' });
  });

  it('hides topics of restricted categories and answers owner policy', async () => {
    const { forumId, admin } = await forum('RESTRICTED', ['group:premium']);
    const premium = await user({ audienceKeys: ['group:premium'] });
    const ordinary = await user({ audienceKeys: ['role:user'] });
    const { topic } = await topics.createTopic(premium, {
      forumId,
      kind: 'DISCUSSION',
      title: 'Premium only',
      documentJson: 'first',
    });
    await expect(topics.topic(ordinary, topic.id)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
    await expect(topics.topic(admin, topic.id)).resolves.toMatchObject({
      id: topic.id,
    });
    const target = topic.interactionTargetId;
    await expect(topics.permits(topic.id, target, null, 'READ')).resolves.toBe(
      false,
    );
    await expect(
      topics.permits(topic.id, target, premium, 'REACT'),
    ).resolves.toBe(true);
    await expect(
      topics.permits(topic.id, target, premium, 'COMMENT'),
    ).resolves.toBe(false);
    await expect(
      topics.permits(topic.id, randomUUID(), premium, 'READ'),
    ).resolves.toBe(false);
  });

  it('locates a post (topic, number, page) only for viewers who see the topic', async () => {
    const { forumId } = await forum();
    const author = await user();
    const { topic } = await topics.createTopic(author, {
      forumId,
      kind: 'DISCUSSION',
      title: 'Location',
      documentJson: 'first',
    });
    const repliers = await Promise.all(Array.from({ length: 4 }, () => user()));
    const posts = await Promise.all(
      repliers.map((id) =>
        topics.reply(id, {
          topicId: topic.id,
          documentJson: 'reply',
          replyToNumber: null,
          quotedNumbers: [],
        }),
      ),
    );
    const last = posts.find(({ number }) => number === 5)!;
    await expect(topics.postLocation(null, last.id, 2)).resolves.toEqual({
      topicId: topic.id,
      number: 5,
      page: 3,
    });
    await expect(topics.postLocation(null, last.id, 20)).resolves.toMatchObject(
      { page: 1 },
    );
    await expect(
      topics.postLocation(null, randomUUID(), 20),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });

    const restricted = await forum('RESTRICTED', ['group:premium']);
    const premium = await user({ audienceKeys: ['group:premium'] });
    const hidden = await topics.createTopic(premium, {
      forumId: restricted.forumId,
      kind: 'DISCUSSION',
      title: 'Premium location',
      documentJson: 'first',
    });
    await expect(
      topics.postLocation(null, hidden.firstPostId, 20),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(
      topics.postLocation(premium, hidden.firstPostId, 20),
    ).resolves.toMatchObject({ topicId: hidden.topic.id, number: 1 });
  });

  it('rejects media and hidden-content nodes until CH-3, and empty posts', async () => {
    const { forumId } = await forum();
    const author = await user();
    await expect(
      topics.createTopic(author, {
        forumId,
        kind: 'DISCUSSION',
        title: 'Gated',
        documentJson: gated,
      }),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' });
    await expect(
      topics.createTopic(author, {
        forumId,
        kind: 'DISCUSSION',
        title: 'Empty',
        documentJson: '',
      }),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  });

  it('keeps topics and posts undeletable at the database level', async () => {
    const { forumId } = await forum();
    const author = await user();
    const { topic, firstPostId } = await topics.createTopic(author, {
      forumId,
      kind: 'DISCUSSION',
      title: 'Permanent',
      documentJson: 'first',
    });
    await expect(
      fixture.prisma.forumPost.delete({ where: { id: firstPostId } }),
    ).rejects.toThrow();
    await expect(
      fixture.prisma.forumTopic.delete({ where: { id: topic.id } }),
    ).rejects.toThrow();
  });
});
