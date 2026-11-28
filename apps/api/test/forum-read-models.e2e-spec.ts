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
import { ForumMemberStatsAdapter } from '../src/composition/content-reads/infrastructure/forum-member-stats.adapter';
import { PrismaLevelCurrentReader } from '@api/modules/levels/infrastructure/repositories/prisma-level-current.reader';
import { PrismaReputationTotalReader } from '@api/modules/reputation/infrastructure/repositories/prisma-reputation-total.reader';
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
      replyCount: 1,
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
      replyCount: 0,
      lastTopic: null,
    });
  });

  it('lists active moderators separately for a forum and its category', async () => {
    const f = await forum();
    const { categoryId } = await fixture.prisma.forum.findUniqueOrThrow({
      where: { id: f.forumId },
      select: { categoryId: true },
    });
    const admin = await user({
      seesAllCategories: true,
      canAssignModerators: true,
    });
    const own = await user();
    const former = await user();
    await structure.assignModerator(admin, categoryId, own, f.forumId);
    const revoked = await structure.assignModerator(
      admin,
      categoryId,
      former,
      f.forumId,
    );
    await structure.revokeModerator(admin, revoked.id);

    await expect(
      reads.sectionModerators('forum', [f.forumId]),
    ).resolves.toEqual(new Map([[f.forumId, [own]]]));
    await expect(
      reads.sectionModerators('category', [categoryId]),
    ).resolves.toEqual(new Map([[categoryId, [f.moderator]]]));
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
      'createdAt',
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
              createdAt: new Date(0),
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
      // Votes, cards and stats never ask for moderation facts.
      { read: () => Promise.reject(new Error('viewer facts not expected')) },
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

  /** New tests post repeatedly as one member; skip the 60 s cooldown. */
  async function rested(userId: string) {
    await fixture.prisma.forumPostingCooldown.deleteMany({ where: { userId } });
  }

  async function openTopic(
    author: string,
    input: Parameters<ForumTopicsService['createTopic']>[1],
  ) {
    await rested(author);
    return topics.createTopic(author, input);
  }

  async function reply(author: string, topicId: string) {
    await rested(author);
    return topics.reply(author, {
      topicId,
      documentJson: 'reply',
      replyToNumber: null,
      quotedNumbers: [],
    });
  }

  it('counts an author’s visible posts in live topics only', async () => {
    const f = await forum();
    const author = await user();
    const other = await user();
    const live = (
      await openTopic(author, {
        forumId: f.forumId,
        kind: 'DISCUSSION',
        title: 'Live',
        documentJson: 'x',
      })
    ).topic;
    const kept = await reply(author, live.id);
    const hidden = await reply(author, live.id);
    await reply(other, live.id);
    await moderation.hidePost(f.moderator, hidden.id, 'Off-topic');
    const trashed = (
      await openTopic(author, {
        forumId: f.forumId,
        kind: 'DISCUSSION',
        title: 'Trashed',
        documentJson: 'x',
      })
    ).topic;
    await moderation.trashTopic(f.moderator, trashed.id);

    const counts = await reads.memberPostCounts([author, other, author]);
    expect(kept.number).toBe(2);
    expect(counts.get(author)).toBe(2);
    expect(counts.get(other)).toBe(1);
    expect(await reads.memberPostCounts([])).toEqual(new Map());
  });

  it('reads reputation totals and current levels in one batch', async () => {
    const member = await user();
    const [up1, up2, down] = [await user(), await user(), await user()];
    const newcomer = await user();
    await fixture.prisma.reputationEntry.createMany({
      data: [
        { actorId: up1, recipientId: member, value: 1, reason: 'Help' },
        { actorId: up2, recipientId: member, value: 1, reason: 'Help' },
        { actorId: down, recipientId: member, value: -1, reason: 'Rude' },
      ],
    });
    const at = new Date('2026-01-01T00:00:00Z');
    await fixture.prisma.levelTransition.createMany({
      data: [1, 2, 3].map((toLevel) => ({
        userId: member,
        fromLevel: toLevel - 1,
        toLevel,
        direction: 'UP' as const,
        balance: toLevel * 100,
        sourceEventId: 'up-' + member,
        sourceEventName: 'points',
        occurredAt: at,
        createdAt: new Date(at.getTime() + toLevel * 1000),
      })),
    });
    await fixture.prisma.levelTransition.create({
      data: {
        userId: member,
        fromLevel: 3,
        toLevel: 2,
        direction: 'DOWN',
        balance: 250,
        sourceEventId: 'down-' + member,
        sourceEventName: 'points',
        occurredAt: at,
        createdAt: new Date(at.getTime() + 10_000),
      },
    });

    const adapter = new ForumMemberStatsAdapter(
      new PrismaReputationTotalReader(fixture.prisma),
      new PrismaLevelCurrentReader(fixture.prisma),
    );
    const standings = await adapter.standings([member, newcomer]);
    expect(standings.get(member)).toEqual({ reputation: 1, level: 2 });
    expect(standings.get(newcomer)).toEqual({ reputation: 0, level: 0 });
    expect(await adapter.standings([])).toEqual(new Map());
  });

  it('sorts replies while the first post keeps opening page 1', async () => {
    const f = await forum();
    const author = await user();
    const { topic } = await openTopic(author, {
      forumId: f.forumId,
      kind: 'DISCUSSION',
      title: 'Sorted',
      documentJson: 'x',
    });
    const replier = await user();
    const posts: Array<{ id: string }> = [];
    for (let index = 0; index < 4; index++) {
      posts.push(await reply(replier, topic.id));
    }
    // Net ratings: #2 → 1, #3 → 5, #4 → -1, #5 → 5 (tie broken by number).
    const ratings: Array<[number, number]> = [
      [1, 0],
      [6, 1],
      [0, 1],
      [5, 0],
    ];
    for (const [index, [up, down]] of ratings.entries()) {
      await fixture.prisma.forumPost.update({
        where: { id: posts[index].id },
        data: { ratingUp: up, ratingDown: down },
      });
    }
    const numbers = async (
      sort: 'OLDEST' | 'NEWEST' | 'BEST',
      page: number,
      limit: number,
    ) => {
      const result = await topics.posts(author, topic.id, page, limit, sort);
      expect(result.total).toBe(5);
      return result.items.map((post) => post.number);
    };

    expect(await numbers('OLDEST', 1, 20)).toEqual([1, 2, 3, 4, 5]);
    expect(await numbers('NEWEST', 1, 20)).toEqual([1, 5, 4, 3, 2]);
    expect(await numbers('BEST', 1, 20)).toEqual([1, 3, 5, 2, 4]);
    expect(await numbers('NEWEST', 1, 2)).toEqual([1, 5]);
    expect(await numbers('NEWEST', 2, 2)).toEqual([4, 3]);
    expect(await numbers('NEWEST', 3, 2)).toEqual([2]);
    expect(await numbers('BEST', 2, 2)).toEqual([5, 2]);
  });

  it('suggests similar topics by shared tags, then section, never trashed ones', async () => {
    const f = await forum();
    const other = await forum();
    const author = await user();
    const make = async (forumId: string, title: string) =>
      (
        await openTopic(author, {
          forumId,
          kind: 'DISCUSSION',
          title,
          documentJson: 'x',
        })
      ).topic;
    const source = await make(f.forumId, 'Source');
    const sameSection = await make(f.forumId, 'Same section');
    const twoTags = await make(other.forumId, 'Two tags');
    const oneTag = await make(other.forumId, 'One tag');
    const unrelated = await make(other.forumId, 'Unrelated');
    const trashed = await make(f.forumId, 'Trashed');
    await moderation.trashTopic(f.moderator, trashed.id);

    const tag = async (forumId: string, slug: string, topicIds: string[]) => {
      const created = await fixture.prisma.forumTag.create({
        data: { forumId, slug, label: slug },
      });
      await fixture.prisma.forumTopicTag.createMany({
        data: topicIds.map((topicId) => ({ topicId, tagId: created.id })),
      });
    };
    await tag(f.forumId, 'nextjs', [source.id]);
    await tag(f.forumId, 'cache', [source.id, trashed.id]);
    await tag(other.forumId, 'nextjs', [twoTags.id, oneTag.id]);
    await tag(other.forumId, 'cache', [twoTags.id]);
    await tag(other.forumId, 'rust', [unrelated.id]);

    const viewer = await user();
    const similar = await topics.similarTopics(viewer, source.id, 5);
    expect(similar.map(({ id }) => id)).toEqual([
      twoTags.id,
      oneTag.id,
      sameSection.id,
    ]);
    expect(await topics.similarTopics(viewer, source.id, 1)).toHaveLength(1);
  });

  it('counts section facets and filters topics by kind', async () => {
    const f = await forum();
    const author = await user();
    const other = await user();
    const make = async (
      who: string,
      kind: 'QUESTION' | 'DISCUSSION',
      title: string,
    ) =>
      (
        await openTopic(who, {
          forumId: f.forumId,
          kind,
          title,
          documentJson: 'x',
        })
      ).topic;
    const solved = await make(author, 'QUESTION', 'Solved question');
    const open = await make(author, 'QUESTION', 'Open question');
    const talk = await make(other, 'DISCUSSION', 'Talk');
    const closed = await make(other, 'DISCUSSION', 'Closed talk');
    const archived = await make(other, 'DISCUSSION', 'Old talk');
    const answer = await reply(other, solved.id);
    await reply(author, talk.id);
    await fixture.prisma.forumTopic.update({
      where: { id: solved.id },
      data: {
        acceptedAnswerPostId: answer.id,
        acceptedAt: new Date(),
        acceptedById: author,
      },
    });
    await fixture.prisma.forumTopic.update({
      where: { id: closed.id },
      data: { state: 'CLOSED' },
    });
    await fixture.prisma.forumTopic.update({
      where: { id: archived.id },
      data: { state: 'ARCHIVED' },
    });

    expect(await topics.facets(author, f.forumId)).toEqual({
      total: 4,
      questions: 2,
      discussions: 2,
      accepted: 1,
      unsolved: 1,
      noReplies: 2,
      closed: 1,
      archived: 1,
      mine: 2,
      participants: 2,
    });
    expect((await topics.facets(null, f.forumId)).mine).toBeNull();

    const kinds = async (kind: 'QUESTION' | 'DISCUSSION') =>
      (
        await topics.topics(
          null,
          f.forumId,
          'LAST_ACTIVITY',
          1,
          20,
          'ACTIVE',
          'WEEK',
          null,
          'ALL',
          kind,
        )
      ).items
        .map(({ id }) => id)
        .sort();
    expect(await kinds('QUESTION')).toEqual([solved.id, open.id].sort());
    expect(await kinds('DISCUSSION')).toEqual([talk.id, closed.id].sort());
    const hot = await topics.topics(
      null,
      f.forumId,
      'HOT',
      1,
      20,
      'ACTIVE',
      'WEEK',
      null,
      'ALL',
      'QUESTION',
    );
    expect(hot.items.map(({ kind }) => kind)).toEqual(['QUESTION', 'QUESTION']);
  });
});
