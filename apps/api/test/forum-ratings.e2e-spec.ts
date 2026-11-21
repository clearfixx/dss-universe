/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Forum (Community Hub)
 * 📄 File: apps/api/test/forum-ratings.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Verifies CH-2 content ratings, ranking, views and unread state against
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
import { ForumRatingsService } from '@api/modules/forum/infrastructure/prisma-forum-ratings';
import { ForumStructureService } from '@api/modules/forum/infrastructure/prisma-forum-structure';
import { ForumTopicsService } from '@api/modules/forum/infrastructure/prisma-forum-topics';
import { ForumModerationService } from '@api/modules/forum/infrastructure/prisma-forum-moderation';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

describe('Forum content ratings (e2e)', () => {
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let structure: ForumStructureService;
  let topics: ForumTopicsService;
  let ratings: ForumRatingsService;
  let moderation: ForumModerationService;
  const facts = new Map<string, Partial<ForumViewerFacts>>();
  const accounts = new Map<string, Date>();

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
    ratings = new ForumRatingsService(
      fixture.prisma,
      audit,
      outbox,
      viewers,
      {
        find: (id) =>
          Promise.resolve(
            accounts.has(id)
              ? { active: true, createdAt: accounts.get(id)! }
              : null,
          ),
      },
      topics,
    );
    moderation = new ForumModerationService(
      fixture.prisma,
      audit,
      outbox,
      viewers,
      topics,
    );
  }, 60000);

  afterAll(async () => {
    await fixture?.close();
  });

  async function user(
    viewer: Partial<ForumViewerFacts> = {},
    ageDays = 30,
  ): Promise<string> {
    const id = randomUUID();
    await fixture.prisma.user.create({
      data: {
        id,
        email: `rate-${id}@dss.test`,
        username: `rate-${id}`,
        passwordHash: 'fixture-hash',
      },
    });
    facts.set(id, viewer);
    accounts.set(id, new Date(Date.now() - ageDays * 86_400_000));
    return id;
  }

  async function forum() {
    const admin = await user({
      seesAllCategories: true,
      canAssignModerators: true,
      moderatesAllCategories: true,
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
      slug: 'general',
      title: 'General',
      description: null,
      position: 0,
      allowsGatedContent: false,
      active: true,
    });
    return { forumId: created.id, admin };
  }

  async function topic(forumId: string, title = 'Rated topic') {
    const author = await user();
    const created = await topics.createTopic(author, {
      forumId,
      kind: 'DISCUSSION',
      title,
      documentJson: 'first',
    });
    return { author, ...created };
  }

  it('rates posts, mirrors post #1 into the topic and never touches reputation or points', async () => {
    const { forumId } = await forum();
    const { topic: created, firstPostId } = await topic(forumId);
    const voters = await Promise.all([user(), user(), user()]);
    await ratings.vote(voters[0], firstPostId, 1);
    await ratings.vote(voters[1], firstPostId, 1);
    const result = await ratings.vote(voters[2], firstPostId, -1);
    expect(result).toMatchObject({ ratingUp: 2, ratingDown: 1 });
    await expect(topics.topic(null, created.id)).resolves.toMatchObject({
      ratingUp: 2,
      ratingDown: 1,
    });
    await expect(fixture.prisma.reputationEntry.count()).resolves.toBe(0);
    await expect(fixture.prisma.communityPointEntry.count()).resolves.toBe(0);
  });

  it('keeps votes final, one per voter, even under concurrency', async () => {
    const { forumId } = await forum();
    const { firstPostId } = await topic(forumId);
    const voter = await user();
    const outcomes = await Promise.allSettled([
      ratings.vote(voter, firstPostId, 1),
      ratings.vote(voter, firstPostId, -1),
      ratings.vote(voter, firstPostId, 1),
    ]);
    expect(
      outcomes.filter(({ status }) => status === 'fulfilled'),
    ).toHaveLength(1);
    const post = await fixture.prisma.forumPost.findUniqueOrThrow({
      where: { id: firstPostId },
    });
    expect(post.ratingUp + post.ratingDown).toBe(1);
    await expect(
      fixture.prisma.forumPostVote.deleteMany({
        where: { postId: firstPostId },
      }),
    ).rejects.toThrow();
  });

  it('enforces eligibility: account age, own post and topic state', async () => {
    const { forumId, admin } = await forum();
    const { author, topic: created, firstPostId } = await topic(forumId);
    const newcomer = await user({}, 3);
    await expect(ratings.vote(newcomer, firstPostId, 1)).rejects.toMatchObject({
      code: 'ACCESS_DENIED',
    });
    await expect(ratings.vote(author, firstPostId, 1)).rejects.toMatchObject({
      code: 'ACCESS_DENIED',
    });
    await topics.closeTopic(admin, created.id);
    const late = await user();
    await expect(ratings.vote(late, firstPostId, 1)).rejects.toMatchObject({
      code: 'CONFLICT',
    });
  });

  it('lists every voter and lets moderators reverse a vote with a reason', async () => {
    const { forumId, admin } = await forum();
    const { firstPostId } = await topic(forumId);
    const voter = await user();
    await ratings.vote(voter, firstPostId, -1);
    await expect(
      ratings.reverseVote(voter, firstPostId, voter, 'Mine'),
    ).rejects.toMatchObject({ code: 'ACCESS_DENIED' });
    await expect(
      ratings.reverseVote(admin, firstPostId, voter, 'Retaliation vote'),
    ).resolves.toMatchObject({ ratingDown: 0 });
    const dialog = await ratings.votes(null, firstPostId, 1, 50);
    expect(dialog.items).toEqual([
      expect.objectContaining({ voterId: voter, value: -1, reversed: true }),
    ]);
    await expect(
      ratings.reverseVote(admin, firstPostId, voter, 'Again'),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  it('orders topics by TOP and HOT with pinned topics first', async () => {
    const { forumId, admin } = await forum();
    const low = await topic(forumId, 'Low topic');
    const high = await topic(forumId, 'High topic');
    const pinned = await topic(forumId, 'Pinned topic');
    for (let i = 0; i < 3; i += 1) {
      await ratings.vote(await user(), high.firstPostId, 1);
    }
    await ratings.vote(await user(), low.firstPostId, -1);
    await moderation.pinTopic(admin, pinned.topic.id, true);
    const top = await topics.topics(
      null,
      forumId,
      'TOP',
      1,
      20,
      'ACTIVE',
      'ALL',
    );
    expect(top.items.map(({ title }) => title)).toEqual([
      'Pinned topic',
      'High topic',
      'Low topic',
    ]);
    const hot = await topics.topics(null, forumId, 'HOT', 1, 20);
    expect(hot.items[0].title).toBe('Pinned topic');
    expect(hot.items[1].title).toBe('High topic');
    expect(hot.total).toBe(3);
  });

  it('counts unique signed-in views and keeps unread state monotonic', async () => {
    const { forumId } = await forum();
    const { topic: created } = await topic(forumId);
    const reader = await user();
    await ratings.recordView(reader, created.id);
    await ratings.recordView(reader, created.id);
    await ratings.recordView(await user(), created.id);
    await expect(topics.topic(null, created.id)).resolves.toMatchObject({
      viewCount: 2,
      viewerLastReadNumber: null,
    });
    await expect(topics.topic(reader, created.id)).resolves.toMatchObject({
      viewerLastReadNumber: 0,
    });
    await expect(ratings.markRead(reader, created.id, 5)).resolves.toBe(1);
    await expect(ratings.markRead(reader, created.id, 1)).resolves.toBe(1);
    await expect(topics.topic(reader, created.id)).resolves.toMatchObject({
      viewerLastReadNumber: 1,
    });
  });
});
