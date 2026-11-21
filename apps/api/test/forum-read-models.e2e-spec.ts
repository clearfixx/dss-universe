/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Forum (Community Hub)
 * 📄 File: apps/api/test/forum-read-models.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Verifies CH-5d UI read models (member cards, viewer vote, forum activity)
 * and their per-request batching against migrated PostgreSQL.
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
import { ForumModerationService } from '@api/modules/forum/infrastructure/prisma-forum-moderation';
import { PrismaForumReadModels } from '@api/modules/forum/infrastructure/prisma-forum-read-models';
import { ForumStructureService } from '@api/modules/forum/infrastructure/prisma-forum-structure';
import { ForumTopicsService } from '@api/modules/forum/infrastructure/prisma-forum-topics';
import { ForumReadLoaders } from '@api/modules/forum/presentation/forum-read-models.resolver';
import { ForumMemberCardsAdapter } from '../src/composition/content-reads/infrastructure/forum-member-cards.adapter';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

describe('Forum UI read models (e2e)', () => {
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let structure: ForumStructureService;
  let topics: ForumTopicsService;
  let moderation: ForumModerationService;
  let reads: PrismaForumReadModels;
  let cards: ForumMemberCardsAdapter;
  const facts = new Map<string, Partial<ForumViewerFacts>>();

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
    moderation = new ForumModerationService(
      fixture.prisma,
      audit,
      outbox,
      viewers,
      topics,
    );
    reads = new PrismaForumReadModels(fixture.prisma);
    cards = new ForumMemberCardsAdapter(fixture.prisma);
  }, 60000);

  afterAll(async () => {
    await fixture?.close();
  });

  async function user(viewer: Partial<ForumViewerFacts> = {}) {
    const id = randomUUID();
    await fixture.prisma.user.create({
      data: {
        id,
        email: `rm-${id}@dss.test`,
        username: `rm-${id.slice(0, 8)}`,
        displayName: 'Member ' + id.slice(0, 4),
        passwordHash: 'fixture-hash',
      },
    });
    facts.set(id, viewer);
    return id;
  }

  async function forum() {
    const admin = await user({
      seesAllCategories: true,
      canAssignModerators: true,
    });
    const category = await structure.createCategory(admin, {
      slug: 'c-' + randomUUID().slice(0, 8),
      title: 'Category',
      description: null,
      position: 0,
      visibility: 'PUBLIC',
      audienceKeys: [],
      active: true,
    });
    const created = await structure.createForum(admin, {
      categoryId: category.id,
      parentId: null,
      slug: 'f',
      title: 'Forum',
      description: null,
      position: 0,
      allowsGatedContent: false,
      active: true,
    });
    const moderator = await user();
    await structure.assignModerator(admin, category.id, moderator);
    return { forumId: created.id, moderator };
  }

  it('counts visible topics and posts and names the latest activity', async () => {
    const f = await forum();
    const empty = await forum();
    const a = await user();
    const b = await user();
    const first = (
      await topics.createTopic(a, {
        forumId: f.forumId,
        kind: 'DISCUSSION',
        title: 'First',
        documentJson: 'x',
      })
    ).topic;
    const trashed = (
      await topics.createTopic(b, {
        forumId: f.forumId,
        kind: 'DISCUSSION',
        title: 'Trashed',
        documentJson: 'x',
      })
    ).topic;
    await moderation.trashTopic(f.moderator, trashed.id);
    const replier = await user();
    await topics.reply(replier, {
      topicId: first.id,
      documentJson: 'reply',
      replyToNumber: null,
      quotedNumbers: [],
    });

    const stats = await reads.forumStats([f.forumId, empty.forumId]);
    expect(stats.get(f.forumId)).toMatchObject({
      topicCount: 1,
      postCount: 2,
      lastTopic: {
        id: first.id,
        title: 'First',
        lastPostNumber: 2,
        lastPostAuthorId: replier,
      },
    });
    expect(stats.get(empty.forumId)).toEqual({
      topicCount: 0,
      postCount: 0,
      lastTopic: null,
    });
  });

  it('returns only the viewer’s active votes and public member cards', async () => {
    const f = await forum();
    const author = await user();
    const viewer = await user();
    const { firstPostId } = await topics.createTopic(author, {
      forumId: f.forumId,
      kind: 'DISCUSSION',
      title: 'Votes',
      documentJson: 'x',
    });
    const reply = await topics
      .reply(author, {
        topicId: (
          await fixture.prisma.forumPost.findUniqueOrThrow({
            where: { id: firstPostId },
          })
        ).topicId,
        documentJson: 'reply',
        replyToNumber: null,
        quotedNumbers: [],
      })
      .catch(async () => {
        // Same author within the cooldown: step past it and retry.
        await fixture.prisma.forumPostingCooldown.deleteMany({
          where: { userId: author },
        });
        const post = await fixture.prisma.forumPost.findUniqueOrThrow({
          where: { id: firstPostId },
        });
        return topics.reply(author, {
          topicId: post.topicId,
          documentJson: 'reply',
          replyToNumber: null,
          quotedNumbers: [],
        });
      });
    await fixture.prisma.forumPostVote.createMany({
      data: [
        { postId: firstPostId, voterId: viewer, value: 1 },
        {
          postId: reply.id,
          voterId: viewer,
          value: -1,
          reversedAt: new Date(),
          reversedById: f.moderator,
          reversalReason: 'Mistake',
        },
      ],
    });
    const votes = await reads.viewerVotes(viewer, [firstPostId, reply.id]);
    expect([...votes.entries()]).toEqual([[firstPostId, 1]]);

    const found = await cards.cards([author, viewer, author, randomUUID()]);
    expect(found).toHaveLength(2);
    expect(Object.keys(found[0]).sort()).toEqual([
      'avatarUrl',
      'displayName',
      'id',
      'username',
    ]);
  });

  it('batches every field of one request into one query per kind', async () => {
    const calls = { cards: 0, votes: 0, stats: 0 };
    const loaders = new ForumReadLoaders(
      {
        cards: (ids) => {
          calls.cards++;
          return Promise.resolve(
            ids.map((id) => ({
              id,
              username: id,
              displayName: null,
              avatarUrl: null,
            })),
          );
        },
      },
      {
        viewerVotes: (_viewer: string, ids: readonly string[]) => {
          calls.votes++;
          return Promise.resolve(new Map(ids.map((id) => [id, 1])));
        },
        forumStats: (ids: readonly string[]) => {
          calls.stats++;
          return Promise.resolve(
            new Map(
              ids.map((id) => [
                id,
                {
                  topicCount: 1,
                  postCount: 1,
                  lastTopic: null,
                },
              ]),
            ),
          );
        },
      } as unknown as PrismaForumReadModels,
    );
    const signedIn = { req: { user: { id: 'viewer' } as never } };
    const guest = { req: {} };
    const l = loaders.for(signedIn);
    const results = await Promise.all([
      ...['a', 'b', 'a', 'c'].map((id) => l.cards.load(id)),
      ...['p1', 'p2'].map((id) => l.votes.load(id)),
      ...['f1', 'f2'].map((id) => l.stats.load(id)),
    ]);
    expect(results).toHaveLength(8);
    expect(calls).toEqual({ cards: 1, votes: 1, stats: 1 });
    expect(loaders.for(signedIn)).toBe(l);
    // A guest has no votes and gets its own loaders.
    await expect(loaders.for(guest).votes.load('p1')).resolves.toBeNull();
    expect(calls.votes).toBe(1);
  });

  it('follows the last VISIBLE post through hide, delete, restore and purge', async () => {
    const f = await forum();
    const opener = await user();
    const replier = await user();
    const { topic } = await topics.createTopic(opener, {
      forumId: f.forumId,
      kind: 'DISCUSSION',
      title: 'Activity',
      documentJson: 'x',
    });
    const last = await topics.reply(replier, {
      topicId: topic.id,
      documentJson: 'last reply',
      replyToNumber: null,
      quotedNumbers: [],
    });
    const activity = async () =>
      (await reads.forumStats([f.forumId])).get(f.forumId)!;
    const expectLast = async (
      number: number,
      author: string,
      posts: number,
    ) => {
      const stats = await activity();
      expect(stats.postCount).toBe(posts);
      expect(stats.lastTopic).toMatchObject({
        id: topic.id,
        lastPostNumber: number,
        lastPostAuthorId: author,
      });
    };

    await expectLast(2, replier, 2);
    await moderation.hidePost(f.moderator, last.id, 'Off-topic');
    await expectLast(1, opener, 1);
    await moderation.restorePost(f.moderator, last.id);
    await expectLast(2, replier, 2);
    await moderation.deletePost(f.moderator, last.id, 'Spam');
    await expectLast(1, opener, 1);
    await moderation.restorePost(f.moderator, last.id);
    await expectLast(2, replier, 2);

    const admin = await user({ canPurgeContent: true });
    await moderation.purgePost(admin, last.id, 'Leaked secret');
    const after = await activity();
    expect(after.lastTopic?.lastPostNumber).toBe(1);
    expect(after.lastTopic?.lastPostAt).toEqual(topic.createdAt);
  });
});
