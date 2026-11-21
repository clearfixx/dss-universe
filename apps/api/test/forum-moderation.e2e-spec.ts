/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Forum (Community Hub)
 * 📄 File: apps/api/test/forum-moderation.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Verifies CH-1b forum moderation against migrated PostgreSQL.
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

describe('Forum moderation (e2e)', () => {
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
        searchText: 'text ' + json,
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
        email: `mod-${id}@dss.test`,
        username: `mod-${id}`,
        passwordHash: 'fixture-hash',
      },
    });
    facts.set(id, viewer);
    return id;
  }

  async function scene() {
    const admin = await user({
      seesAllCategories: true,
      canAssignModerators: true,
      canPurgeContent: true,
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
    const forum = await structure.createForum(admin, {
      categoryId: category.id,
      parentId: null,
      slug: 'general',
      title: 'General',
      description: null,
      position: 0,
      allowsGatedContent: false,
      active: true,
    });
    const moderator = await user();
    await structure.assignModerator(admin, category.id, moderator);
    const author = await user();
    const replier = await user();
    const { topic, firstPostId } = await topics.createTopic(author, {
      forumId: forum.id,
      kind: 'DISCUSSION',
      title: 'Moderated topic',
      documentJson: 'first',
    });
    const reply = await topics.reply(replier, {
      topicId: topic.id,
      documentJson: 'secret reply',
      replyToNumber: null,
      quotedNumbers: [],
    });
    return {
      admin,
      moderator,
      author,
      replier,
      forumId: forum.id,
      topic,
      firstPostId,
      reply,
    };
  }

  it('deletes a reply as a tombstone visible in full only to staff, and restores it', async () => {
    const s = await scene();
    await expect(
      moderation.deletePost(s.replier, s.reply.id, 'Self delete'),
    ).rejects.toMatchObject({ code: 'ACCESS_DENIED' });
    await moderation.deletePost(s.moderator, s.reply.id, 'Off-topic flood');

    const publicView = (await topics.posts(null, s.topic.id, 1, 20)).items[1];
    expect(publicView).toMatchObject({
      state: 'DELETED',
      documentJson: null,
      moderation: null,
    });
    const staffView = (await topics.posts(s.moderator, s.topic.id, 1, 20))
      .items[1];
    expect(staffView.documentJson).not.toBeNull();
    expect(staffView.moderation).toMatchObject({
      byId: s.moderator,
      reason: 'Off-topic flood',
    });

    await moderation.restorePost(s.moderator, s.reply.id);
    const restored = (await topics.posts(null, s.topic.id, 1, 20)).items[1];
    expect(restored.state).toBe('VISIBLE');
    expect(restored.documentJson).not.toBeNull();
  });

  it('lets a curator moderate replies of their topic only, never the first post', async () => {
    const s = await scene();
    await fixture.prisma.forumTopic.update({
      where: { id: s.topic.id },
      data: { curatorId: s.author },
    });
    await moderation.hidePost(s.author, s.reply.id, 'Curator hides');
    await expect(
      moderation.deletePost(s.moderator, s.firstPostId, 'First post'),
    ).rejects.toMatchObject({ code: 'ACCESS_DENIED' });
    const note = await moderation.addStaffNote(
      s.author,
      s.reply.id,
      'Please stay on topic.',
    );
    expect(note.role).toBe('CURATOR');
    const notes = (await topics.posts(null, s.topic.id, 1, 20)).items[1]
      .staffNotes;
    expect(notes.map(({ body }) => body)).toEqual(['Please stay on topic.']);
  });

  it('archives, trashes and restores topics; trash is visible to moderators only', async () => {
    const s = await scene();
    await expect(
      moderation.trashTopic(s.author, s.topic.id),
    ).rejects.toMatchObject({ code: 'ACCESS_DENIED' });
    await moderation.archiveTopic(s.moderator, s.topic.id);
    await expect(topics.topic(null, s.topic.id)).resolves.toMatchObject({
      state: 'ARCHIVED',
    });
    const archived = await topics.topics(
      null,
      s.forumId,
      'LAST_ACTIVITY',
      1,
      20,
      'ARCHIVED',
    );
    expect(archived.items.map(({ id }) => id)).toEqual([s.topic.id]);

    await moderation.trashTopic(s.moderator, s.topic.id);
    await expect(topics.topic(s.author, s.topic.id)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
    await expect(
      topics.topics(s.author, s.forumId, 'LAST_ACTIVITY', 1, 20, 'TRASHED'),
    ).rejects.toMatchObject({ code: 'ACCESS_DENIED' });
    await expect(topics.topic(s.moderator, s.topic.id)).resolves.toMatchObject({
      state: 'TRASHED',
    });

    await moderation.restoreTopic(s.moderator, s.topic.id);
    await expect(topics.topic(null, s.topic.id)).resolves.toMatchObject({
      state: 'ARCHIVED',
    });
  });

  it('pins topics first in the listing', async () => {
    const s = await scene();
    await topics.createTopic(s.admin, {
      forumId: s.forumId,
      kind: 'DISCUSSION',
      title: 'Newer topic',
      documentJson: 'x',
    });
    await moderation.pinTopic(s.moderator, s.topic.id, true);
    const listing = await topics.topics(
      null,
      s.forumId,
      'LAST_ACTIVITY',
      1,
      20,
    );
    expect(listing.items[0]).toMatchObject({ id: s.topic.id, pinned: true });
  });

  it('purges content and revisions irreversibly for administrators only', async () => {
    const s = await scene();
    await expect(
      moderation.purgePost(s.moderator, s.reply.id, 'Leaked secret'),
    ).rejects.toMatchObject({ code: 'ACCESS_DENIED' });
    await moderation.purgePost(s.admin, s.reply.id, 'Leaked API key');
    const stored = await fixture.prisma.forumPost.findUniqueOrThrow({
      where: { id: s.reply.id },
    });
    expect(stored).toMatchObject({
      state: 'PURGED',
      plainText: '',
      searchText: '',
      purgeReason: 'Leaked API key',
    });
    const revisions = await fixture.prisma.forumPostRevision.findMany({
      where: { postId: s.reply.id },
    });
    expect(revisions.every(({ plainText }) => plainText === '')).toBe(true);
    await expect(
      moderation.restorePost(s.admin, s.reply.id),
    ).rejects.toMatchObject({ code: 'ACCESS_DENIED' });
    await expect(
      fixture.prisma.forumPost.update({
        where: { id: s.reply.id },
        data: { state: 'VISIBLE' },
      }),
    ).rejects.toThrow();
    await expect(
      fixture.prisma.forumPostRevision.updateMany({
        where: { postId: s.firstPostId },
        data: { plainText: '' },
      }),
    ).rejects.toThrow();
    const staffView = (await topics.posts(s.admin, s.topic.id, 1, 20)).items[1];
    expect(staffView.documentJson).toBeNull();
  });
});
