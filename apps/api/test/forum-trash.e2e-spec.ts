/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Forum (Community Hub)
 * 📄 File: apps/api/test/forum-trash.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Migrated-schema proof of the forum trash (P1 B07): trash metadata is set
 * and cleared with the topic state, and the cross-section trash list is
 * scoped to the sections the viewer moderates.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { randomUUID } from 'node:crypto';
import { AuditRedactionService, AuditWriterService } from '@api/core/audit';
import { OutboxWriterService } from '@api/core/events';
import type { EditorDocumentNormalizer } from '@api/modules/editor';
import type { ForumViewerFacts } from '@api/modules/forum';
import { ForumModerationService } from '@api/modules/forum/infrastructure/prisma-forum-moderation';
import { ForumStructureService } from '@api/modules/forum/infrastructure/prisma-forum-structure';
import { ForumTopicsService } from '@api/modules/forum/infrastructure/prisma-forum-topics';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

const doc = JSON.stringify({
  schemaVersion: 1,
  profile: 'FORUM_TOPIC',
  content: {
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Body' }] }],
  },
});

describe('Forum trash (e2e)', () => {
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
          accessRole: subjectId ? ('MEMBER' as const) : ('GUEST' as const),
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
    const normalize = (json: string) => ({
      document: JSON.parse(json) as never,
      canonicalJson: json,
      plainText: 'Body',
      searchText: 'body',
    });
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
        project: (documentJson) =>
          Promise.resolve({ documentJson, gates: [] as never }),
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
        email: `trash-${id}@dss.test`,
        username: `trash-${id.slice(0, 8)}`,
        passwordHash: 'fixture-hash',
      },
    });
    facts.set(id, viewer);
    return id;
  }

  const admin = () =>
    user({
      accessRole: 'ADMIN',
      seesAllCategories: true,
      canAssignModerators: true,
    });

  async function section(owner: string) {
    const category = await structure.createCategory(owner, {
      slug: 'c-' + randomUUID().slice(0, 8),
      title: 'Category',
      description: null,
      position: 0,
      visibility: 'PUBLIC',
      audienceKeys: [],
      active: true,
    });
    const forum = await structure.createForum(owner, {
      categoryId: category.id,
      parentId: null,
      slug: 'f-' + randomUUID().slice(0, 6),
      title: 'Forum',
      description: null,
      position: 0,
      allowsGatedContent: false,
      active: true,
    });
    return { categoryId: category.id, forumId: forum.id };
  }

  async function trashed(owner: string, forumId: string, title: string) {
    const author = await user();
    const { topic } = await topics.createTopic(author, {
      forumId,
      kind: 'DISCUSSION',
      title,
      documentJson: doc,
    });
    await moderation.trashTopic(owner, topic.id);
    return topic.id;
  }

  it('records who trashed a topic and clears it on restore', async () => {
    const owner = await admin();
    const { forumId } = await section(owner);
    const id = await trashed(owner, forumId, 'Spam topic');

    const inTrash = await fixture.prisma.forumTopic.findUniqueOrThrow({
      where: { id },
    });
    expect(inTrash.state).toBe('TRASHED');
    expect(inTrash.trashedById).toBe(owner);
    expect(inTrash.trashedAt).toBeInstanceOf(Date);

    const restored = await moderation.restoreTopic(owner, id);
    expect(restored.trashedAt).toBeNull();
    const row = await fixture.prisma.forumTopic.findUniqueOrThrow({
      where: { id },
    });
    expect(row.trashedAt).toBeNull();
    expect(row.trashedById).toBeNull();
  });

  it('lists only the sections the viewer moderates', async () => {
    const owner = await admin();
    const mine = await section(owner);
    const other = await section(owner);
    const a = await trashed(owner, mine.forumId, 'Mine duplicate');
    const b = await trashed(owner, other.forumId, 'Other duplicate');

    const sectionModerator = await user();
    await structure.assignModerator(
      owner,
      mine.categoryId,
      sectionModerator,
      mine.forumId,
    );
    const page = await topics.trash(sectionModerator, 1, 50);
    const ids = page.items.map((item) => item.id);
    expect(ids).toContain(a);
    expect(ids).not.toContain(b);
    expect(page.items.find((item) => item.id === a)?.trashedById).toBe(owner);

    await expect(
      topics.trash(sectionModerator, 1, 20, other.forumId),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });

    const supermoderator = await user({ moderatesAllCategories: true });
    const all = (await topics.trash(supermoderator, 1, 50)).items.map(
      (item) => item.id,
    );
    expect(all).toEqual(expect.arrayContaining([a, b]));

    const searched = await topics.trash(supermoderator, 1, 50, null, 'MINE');
    expect(searched.items.map((item) => item.id)).toContain(a);
    expect(searched.items.map((item) => item.id)).not.toContain(b);
  });

  it('denies the trash to members', async () => {
    const member = await user();
    await expect(topics.trash(member, 1, 20)).rejects.toMatchObject({
      code: 'ACCESS_DENIED',
    });
  });

  it('summarises the moderator area within the viewer scope', async () => {
    const owner = await admin();
    const mine = await section(owner);
    const other = await section(owner);
    const a = await trashed(owner, mine.forumId, 'Overview mine');
    const b = await trashed(owner, other.forumId, 'Overview other');

    const sectionModerator = await user();
    await structure.assignModerator(
      owner,
      mine.categoryId,
      sectionModerator,
      mine.forumId,
    );
    const overview = await topics.moderationOverview(sectionModerator);
    expect(overview.allSections).toBe(false);
    expect(overview.sections.map(({ id }) => id)).toEqual([mine.forumId]);
    expect(overview.trashCount).toBe(1);
    const mineAction = overview.recentActions.find((r) => r.topicId === a);
    expect(mineAction).toMatchObject({
      action: 'topic.trashed',
      actorId: owner,
      topicTitle: 'Overview mine',
      postNumber: null,
    });
    expect(overview.recentActions.some((r) => r.topicId === b)).toBe(false);

    const supermoderator = await user({ moderatesAllCategories: true });
    const all = await topics.moderationOverview(supermoderator);
    expect(all.allSections).toBe(true);
    expect(all.recentActions.map((r) => r.topicId)).toEqual(
      expect.arrayContaining([a, b]),
    );

    const member = await user();
    await expect(topics.moderationOverview(member)).rejects.toMatchObject({
      code: 'ACCESS_DENIED',
    });
  });
});
