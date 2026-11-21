/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Forum (Community Hub)
 * 📄 File: apps/api/test/forum-listing-filters.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Verifies topic list filters and the viewer's cross-forum topic lists
 * against migrated PostgreSQL.
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
import { ForumStructureService } from '@api/modules/forum/infrastructure/prisma-forum-structure';
import { ForumTopicsService } from '@api/modules/forum/infrastructure/prisma-forum-topics';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

describe('Forum listing filters (e2e)', () => {
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let structure: ForumStructureService;
  let topics: ForumTopicsService;
  let moderation: ForumModerationService;
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
  }, 60000);

  afterAll(async () => {
    await fixture?.close();
  });

  async function user(viewer: Partial<ForumViewerFacts> = {}) {
    const id = randomUUID();
    await fixture.prisma.user.create({
      data: {
        id,
        email: `list-${id}@dss.test`,
        username: `list-${id}`,
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
    const category = await structure.createCategory(admin, {
      slug: 'c-' + randomUUID().slice(0, 8),
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

  async function topic(
    authorId: string,
    forumId: string,
    kind: 'QUESTION' | 'DISCUSSION',
    title: string,
  ) {
    await skipCooldown(authorId);
    return (
      await topics.createTopic(authorId, {
        forumId,
        kind,
        title,
        documentJson: title,
      })
    ).topic;
  }

  /** Steps past the 60-second posting cooldown without waiting. */
  const skipCooldown = (userId: string) =>
    fixture.prisma.forumPostingCooldown.deleteMany({ where: { userId } });

  const titles = (page: { items: Array<{ title: string }> }) =>
    page.items.map(({ title }) => title).sort();

  it('filters by author, missing replies and unsolved questions in every sort', async () => {
    const { forumId } = await forum();
    const me = await user();
    const other = await user();
    const solved = await topic(other, forumId, 'QUESTION', 'Solved question');
    await topic(other, forumId, 'QUESTION', 'Open question');
    const replied = await topic(me, forumId, 'DISCUSSION', 'Replied talk');
    await topic(me, forumId, 'DISCUSSION', 'Quiet talk');
    await skipCooldown(me);
    const answer = await topics.reply(me, {
      topicId: solved.id,
      documentJson: 'answer',
      replyToNumber: 1,
      quotedNumbers: [],
    });
    await skipCooldown(me);
    await topics.reply(me, {
      topicId: replied.id,
      documentJson: 'reply',
      replyToNumber: null,
      quotedNumbers: [],
    });
    await fixture.prisma.forumTopic.update({
      where: { id: solved.id },
      data: {
        acceptedAnswerPostId: answer.id,
        acceptedAt: new Date(),
        acceptedById: other,
      },
    });

    for (const sort of ['LAST_ACTIVITY', 'HOT'] as const) {
      const list = (filter: 'ALL' | 'MINE' | 'NO_REPLIES' | 'UNSOLVED') =>
        topics.topics(me, forumId, sort, 1, 20, 'ACTIVE', 'WEEK', null, filter);
      expect(titles(await list('ALL'))).toHaveLength(4);
      expect(titles(await list('MINE'))).toEqual([
        'Quiet talk',
        'Replied talk',
      ]);
      expect(titles(await list('NO_REPLIES'))).toEqual([
        'Open question',
        'Quiet talk',
      ]);
      expect(titles(await list('UNSOLVED'))).toEqual(['Open question']);
      expect((await list('UNSOLVED')).total).toBe(1);
    }
    await expect(
      topics.topics(
        null,
        forumId,
        'LAST_ACTIVITY',
        1,
        20,
        'ACTIVE',
        'WEEK',
        null,
        'MINE',
      ),
    ).rejects.toMatchObject({ code: 'ACCESS_DENIED' });
  });

  it('lists the viewer’s own and followed topics across visible forums only', async () => {
    const open = await forum();
    const premiumForum = await forum('RESTRICTED', ['group:premium']);
    const me = await user({ audienceKeys: ['group:premium'] });
    const other = await user();
    const mine = await topic(me, open.forumId, 'DISCUSSION', 'My open topic');
    const minePremium = await topic(
      me,
      premiumForum.forumId,
      'DISCUSSION',
      'My premium topic',
    );
    const followed = await topic(other, open.forumId, 'QUESTION', 'Followed');
    await topic(other, open.forumId, 'QUESTION', 'Not followed');
    for (const topicId of [followed.id, minePremium.id]) {
      await fixture.prisma.forumTopicSubscription.create({
        data: { userId: me, topicId },
      });
    }

    const authored = await topics.viewerTopics(me, 'AUTHORED', 1, 20);
    expect(titles(authored)).toEqual(['My open topic', 'My premium topic']);
    const subscribed = await topics.viewerTopics(me, 'SUBSCRIBED', 1, 20);
    expect(titles(subscribed)).toEqual(['Followed', 'My premium topic']);
    expect(
      subscribed.items.every((item) => item.viewerLastReadNumber !== null),
    ).toBe(true);

    // Losing access hides the restricted topic; trashed topics disappear too.
    facts.set(me, { audienceKeys: [] });
    await moderation.trashTopic(open.moderator, followed.id);
    expect(titles(await topics.viewerTopics(me, 'SUBSCRIBED', 1, 20))).toEqual(
      [],
    );
    const stillMine = await topics.viewerTopics(me, 'AUTHORED', 1, 20);
    expect(stillMine.items.map(({ id }) => id)).toEqual([mine.id]);
  });
});
