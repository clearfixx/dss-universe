/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Forum (Community Hub)
 * 📄 File: apps/api/test/forum-hub-read-models.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Verifies CH-5e hub read models (cross-forum discovery, hub totals and
 * popular tags) against migrated PostgreSQL, visibility included.
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

describe('Forum hub read models (e2e)', () => {
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let structure: ForumStructureService;
  let topics: ForumTopicsService;
  let moderation: ForumModerationService;
  const facts = new Map<string, Partial<ForumViewerFacts>>();
  let premium: string;
  const ids: Record<string, string> = {};

  async function user(viewer: Partial<ForumViewerFacts> = {}) {
    const id = randomUUID();
    await fixture.prisma.user.create({
      data: {
        id,
        email: `hub-${id}@dss.test`,
        username: `hub-${id}`,
        passwordHash: 'fixture-hash',
      },
    });
    facts.set(id, viewer);
    return id;
  }

  async function forum(visibility: 'PUBLIC' | 'RESTRICTED', keys: string[]) {
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
      audienceKeys: keys,
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
    forumId: string,
    kind: 'QUESTION' | 'DISCUSSION',
    title: string,
    author?: string,
  ) {
    const by = author ?? (await user());
    await fixture.prisma.forumPostingCooldown.deleteMany({
      where: { userId: by },
    });
    return (
      await topics.createTopic(by, {
        forumId,
        kind,
        title,
        documentJson: title,
      })
    ).topic;
  }

  async function tag(forumId: string, slug: string, topicIds: string[]) {
    const created = await fixture.prisma.forumTag.create({
      data: { forumId, slug, label: slug.toUpperCase() },
    });
    await fixture.prisma.forumTopicTag.createMany({
      data: topicIds.map((topicId) => ({ topicId, tagId: created.id })),
    });
  }

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

    // Scene: one public forum, one premium-only forum.
    const open = await forum('PUBLIC', []);
    const closed = await forum('RESTRICTED', ['group:premium']);
    premium = await user({ audienceKeys: ['group:premium'] });
    const unsolved = await topic(open.forumId, 'QUESTION', 'Unsolved question');
    const solved = await topic(open.forumId, 'QUESTION', 'Solved question');
    const replied = await topic(open.forumId, 'DISCUSSION', 'Replied talk');
    const trashed = await topic(open.forumId, 'QUESTION', 'Trashed question');
    const secret = await topic(
      closed.forumId,
      'QUESTION',
      'Premium question',
      premium,
    );
    const helper = await user();
    const answer = await topics.reply(helper, {
      topicId: solved.id,
      documentJson: 'answer',
      replyToNumber: 1,
      quotedNumbers: [],
    });
    await fixture.prisma.forumPostingCooldown.deleteMany({
      where: { userId: helper },
    });
    await topics.reply(helper, {
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
        acceptedById: helper,
      },
    });
    await moderation.trashTopic(open.moderator, trashed.id);
    await tag(open.forumId, 'nextjs', [unsolved.id, solved.id]);
    await tag(open.forumId, 'docker', [replied.id]);
    await tag(closed.forumId, 'nextjs', [secret.id]);
    Object.assign(ids, { unsolved: unsolved.id, secret: secret.id });
  }, 120000);

  afterAll(async () => {
    await fixture?.close();
  });

  const titles = (page: { items: Array<{ title: string }> }) =>
    page.items.map(({ title }) => title).sort();

  it('discovers unsolved questions and unanswered topics across visible forums', async () => {
    const guestUnsolved = await topics.discoverTopics(
      null,
      'UNSOLVED',
      'NEW',
      1,
      10,
    );
    expect(titles(guestUnsolved)).toEqual(['Unsolved question']);
    expect(guestUnsolved.items[0].viewerLastReadNumber).toBeNull();
    expect(
      titles(await topics.discoverTopics(premium, 'UNSOLVED', 'NEW', 1, 10)),
    ).toEqual(['Premium question', 'Unsolved question']);
    expect(
      titles(
        await topics.discoverTopics(null, 'NO_REPLIES', 'LAST_ACTIVITY', 1, 10),
      ),
    ).toEqual(['Unsolved question']);
    expect((await topics.discoverTopics(null, 'ALL', 'NEW', 1, 10)).total).toBe(
      3,
    );
  });

  it('counts hub totals only for what the viewer can see', async () => {
    await expect(topics.hubStats(null)).resolves.toEqual({
      forumCount: 1,
      topicCount: 3,
      postCount: 5,
      participantCount: 4,
    });
    await expect(topics.hubStats(premium)).resolves.toMatchObject({
      forumCount: 2,
      topicCount: 4,
      postCount: 6,
    });
  });

  it('merges tags by slug across forums and hides restricted usage', async () => {
    await expect(topics.popularTags(null, 10)).resolves.toEqual([
      { slug: 'nextjs', label: 'NEXTJS', topicCount: 2 },
      { slug: 'docker', label: 'DOCKER', topicCount: 1 },
    ]);
    const forPremium = await topics.popularTags(premium, 1);
    expect(forPremium).toEqual([
      { slug: 'nextjs', label: 'NEXTJS', topicCount: 3 },
    ]);
  });
});
