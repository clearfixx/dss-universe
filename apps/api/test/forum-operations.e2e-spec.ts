/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Forum (Community Hub)
 * 📄 File: apps/api/test/forum-operations.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Verifies CH-4 curators, moves, merge/split and scoped sanctions against
 * migrated PostgreSQL.
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
import type { ScopedSanctionCommand } from '@api/modules/moderation';
import { ForumOperationsService } from '@api/modules/forum/infrastructure/prisma-forum-operations';
import { ForumStructureService } from '@api/modules/forum/infrastructure/prisma-forum-structure';
import { ForumTopicsService } from '@api/modules/forum/infrastructure/prisma-forum-topics';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

describe('Forum operations (e2e)', () => {
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let structure: ForumStructureService;
  let topics: ForumTopicsService;
  let operations: ForumOperationsService;
  const facts = new Map<string, Partial<ForumViewerFacts>>();
  const issued: ScopedSanctionCommand[] = [];

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
      const document = createEmptyEditorDocument('FORUM_REPLY');
      return {
        document,
        canonicalJson: JSON.stringify(document),
        plainText: 'Text ' + json,
        searchText: 'text',
      };
    };
    const editor = {
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
    operations = new ForumOperationsService(
      fixture.prisma,
      audit,
      outbox,
      viewers,
      {
        issueScoped: (command) => {
          issued.push(command);
          return Promise.resolve({
            sanctionId: randomUUID(),
            escalatedSanctionId: null,
          });
        },
      },
      topics,
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
        email: `ops-${id}@dss.test`,
        username: `ops-${id}`,
        passwordHash: 'fixture-hash',
      },
    });
    facts.set(id, viewer);
    return id;
  }

  async function aged(userId: string) {
    await fixture.prisma.forumPostingCooldown.updateMany({
      where: { userId },
      data: { lastPostAt: new Date(Date.now() - 61_000) },
    });
  }

  async function scene() {
    const admin = await user({
      seesAllCategories: true,
      canAssignModerators: true,
    });
    const category = async (slug: string) =>
      structure.createCategory(admin, {
        slug: slug + '-' + randomUUID().slice(0, 8),
        title: 'Category ' + slug,
        description: null,
        position: 0,
        visibility: 'PUBLIC',
        audienceKeys: [],
        active: true,
      });
    const forum = async (categoryId: string, slug: string) =>
      structure.createForum(admin, {
        categoryId,
        parentId: null,
        slug,
        title: 'Forum ' + slug,
        description: null,
        position: 0,
        allowsGatedContent: false,
        active: true,
      });
    const a = await category('a');
    const b = await category('b');
    const forumA = await forum(a.id, 'one');
    const forumA2 = await forum(a.id, 'two');
    const forumB = await forum(b.id, 'other');
    const moderator = await user();
    await structure.assignModerator(admin, a.id, moderator);
    const author = await user();
    return { admin, moderator, author, forumA, forumA2, forumB };
  }

  async function thread(forumId: string, author: string, replies: number) {
    const { topic } = await topics.createTopic(author, {
      forumId,
      kind: 'DISCUSSION',
      title: 'Thread ' + randomUUID().slice(0, 6),
      documentJson: 'first',
    });
    for (let i = 0; i < replies; i += 1) {
      const replier = await user();
      await topics.reply(replier, {
        topicId: topic.id,
        documentJson: 'reply ' + i,
        replyToNumber: i === 0 ? 1 : i + 1,
        quotedNumbers: [],
      });
    }
    return topic;
  }

  it('assigns and replaces curators only with category moderator scope', async () => {
    const s = await scene();
    const topic = await thread(s.forumA.id, s.author, 0);
    const curator = await user();
    await expect(
      operations.setCurator(s.author, topic.id, curator),
    ).rejects.toMatchObject({ code: 'ACCESS_DENIED' });
    await expect(
      operations.setCurator(s.moderator, topic.id, curator),
    ).resolves.toMatchObject({ curatorId: curator });
    await expect(
      operations.setCurator(s.moderator, topic.id, null),
    ).resolves.toMatchObject({ curatorId: null });
  });

  it('moves a topic with its curator, drops forum tags and needs scope in both categories', async () => {
    const s = await scene();
    const topic = await thread(s.forumA.id, s.author, 0);
    const curator = await user();
    await operations.setCurator(s.moderator, topic.id, curator);
    await expect(
      operations.moveTopic(s.moderator, topic.id, s.forumB.id),
    ).rejects.toMatchObject({ code: 'ACCESS_DENIED' });
    const moved = await operations.moveTopic(
      s.moderator,
      topic.id,
      s.forumA2.id,
    );
    expect(moved).toMatchObject({ forumId: s.forumA2.id, curatorId: curator });
    const supermoderator = await user({ moderatesAllCategories: true });
    await expect(
      operations.moveTopic(supermoderator, topic.id, s.forumB.id),
    ).resolves.toMatchObject({ forumId: s.forumB.id, curatorId: curator });
    // The appointing moderator no longer has scope over the moved topic.
    await expect(
      operations.setCurator(s.moderator, topic.id, null),
    ).rejects.toMatchObject({ code: 'ACCESS_DENIED' });
  });

  it('moves replies, renumbers them, remaps references and keeps origins', async () => {
    const s = await scene();
    const source = await thread(s.forumA.id, s.author, 3);
    await aged(s.author);
    const target = await thread(s.forumA.id, s.author, 1);
    const result = await operations.movePosts(
      s.moderator,
      source.id,
      [2, 3],
      target.id,
    );
    expect(result).toMatchObject({ postCount: 4, lastPostNumber: 4 });
    const moved = await fixture.prisma.forumPost.findMany({
      where: { topicId: target.id, number: { gte: 3 } },
      orderBy: { number: 'asc' },
    });
    expect(moved.map((post) => [post.number, post.originalNumber])).toEqual([
      [3, 2],
      [4, 3],
    ]);
    expect(moved[0].replyToNumber).toBeNull();
    expect(moved[1].replyToNumber).toBe(3);
    await expect(topics.topic(null, source.id)).resolves.toMatchObject({
      postCount: 2,
    });
    await expect(
      operations.movePosts(s.moderator, source.id, [1], target.id),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  });

  it('merges topics into a redirect and hides the source from listings', async () => {
    const s = await scene();
    const source = await thread(s.forumA.id, s.author, 2);
    await aged(s.author);
    const target = await thread(s.forumA.id, s.author, 1);
    const merged = await operations.mergeTopics(
      s.moderator,
      source.id,
      target.id,
    );
    expect(merged).toMatchObject({ postCount: 5, lastPostNumber: 5 });
    await expect(topics.topic(null, source.id)).resolves.toMatchObject({
      mergedIntoTopicId: target.id,
      postCount: 0,
      state: 'CLOSED',
    });
    const listing = await topics.topics(
      null,
      s.forumA.id,
      'LAST_ACTIVITY',
      1,
      20,
    );
    expect(listing.items.map(({ id }) => id)).not.toContain(source.id);
    const hot = await topics.topics(null, s.forumA.id, 'HOT', 1, 20);
    expect(hot.items.map(({ id }) => id)).not.toContain(source.id);
    await expect(
      operations.mergeTopics(s.moderator, source.id, target.id),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  it('splits replies into a new topic whose first post is the first moved reply', async () => {
    const s = await scene();
    const source = await thread(s.forumA.id, s.author, 3);
    const created = await operations.splitTopic(
      s.moderator,
      source.id,
      [3, 4],
      'Split discussion',
    );
    expect(created).toMatchObject({
      title: 'Split discussion',
      postCount: 2,
      lastPostNumber: 2,
      forumId: s.forumA.id,
    });
    const posts = await topics.posts(null, created.id, 1, 20);
    expect(posts.items.map(({ number }) => number)).toEqual([1, 2]);
    expect(posts.items[1].replyToNumber).toBe(1);
    await expect(topics.topic(null, source.id)).resolves.toMatchObject({
      postCount: 2,
    });
  });

  it('routes scoped sanctions through Moderation with the post context', async () => {
    const s = await scene();
    const topic = await thread(s.forumA.id, s.author, 1);
    const reply = (await topics.posts(null, topic.id, 1, 20)).items[1];
    const curator = await user();
    await operations.setCurator(s.moderator, topic.id, curator);
    await operations.warnAuthor(curator, reply.id, 'Off-topic in thread');
    await expect(
      operations.restrictAuthor(
        curator,
        reply.id,
        'Not allowed',
        new Date(Date.now() + 86_400_000),
      ),
    ).rejects.toMatchObject({ code: 'ACCESS_DENIED' });
    await operations.restrictAuthor(
      s.moderator,
      reply.id,
      'Flooding',
      new Date(Date.now() + 86_400_000),
    );
    const [warning, readOnly] = issued.slice(-2);
    expect(warning).toMatchObject({
      actorId: curator,
      subjectId: reply.authorId,
      kind: 'WARNING',
      context: { type: 'forum.post', id: reply.id },
    });
    expect(readOnly).toMatchObject({ actorId: s.moderator, kind: 'READ_ONLY' });
    const stranger = await user();
    await expect(
      operations.warnAuthor(stranger, reply.id, 'No scope'),
    ).rejects.toMatchObject({ code: 'ACCESS_DENIED' });
  });
});
