/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Forum (Community Hub)
 * 📄 File: apps/api/test/forum-admin-settings.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Migrated-schema proof of the Command Deck section settings: role
 * matrices (inheritance, 404 for hidden sections, supermoderator override),
 * section switches, unlisted/searchable sections, forum-level moderators,
 * the pinned limit and the audited batch save.
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
import {
  DEFAULT_FORUM_ACCESS,
  FORUM_ACCESS_ROLES,
  type ForumAccessGrant,
} from '@api/modules/forum/domain/forum-access.rules';
import { ForumModerationService } from '@api/modules/forum/infrastructure/prisma-forum-moderation';
import { PrismaForumSearch } from '@api/modules/forum/infrastructure/prisma-forum-search';
import { ForumStructureService } from '@api/modules/forum/infrastructure/prisma-forum-structure';
import { ForumTopicsService } from '@api/modules/forum/infrastructure/prisma-forum-topics';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

const none: ForumAccessGrant = {
  view: false,
  read: false,
  createTopics: false,
  reply: false,
  editOwn: false,
  deleteOwn: false,
  moderate: false,
};

describe('Forum admin settings (e2e)', () => {
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let structure: ForumStructureService;
  let topics: ForumTopicsService;
  let moderation: ForumModerationService;
  let search: PrismaForumSearch;
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
    const normalize = (json: string) => {
      const document = createEmptyEditorDocument('FORUM_REPLY');
      return {
        document,
        canonicalJson: JSON.stringify(document),
        plainText: 'Text ' + json,
        searchText: 'searchable ' + json,
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
    search = new PrismaForumSearch(fixture.prisma, viewers);
  }, 60000);

  afterAll(async () => {
    await fixture?.close();
  });

  async function user(viewer: Partial<ForumViewerFacts> = {}) {
    const id = randomUUID();
    await fixture.prisma.user.create({
      data: {
        id,
        email: `adm-${id}@dss.test`,
        username: `adm-${id.slice(0, 8)}`,
        passwordHash: 'fixture-hash',
      },
    });
    facts.set(id, viewer);
    return id;
  }

  async function section() {
    const admin = await user({
      accessRole: 'ADMIN',
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
    const forum = await structure.createForum(admin, {
      categoryId: category.id,
      parentId: null,
      slug: 'web-' + randomUUID().slice(0, 6),
      title: 'Web',
      description: null,
      position: 0,
      allowsGatedContent: false,
      active: true,
    });
    return { admin, categoryId: category.id, forumId: forum.id };
  }

  const forumInput = (
    categoryId: string,
    change: Record<string, unknown> = {},
  ) => ({
    categoryId,
    parentId: null,
    slug: 'web',
    title: 'Web',
    description: null,
    position: 0,
    allowsGatedContent: false,
    active: true,
    ...change,
  });

  const matrix = (change: Partial<Record<string, Partial<ForumAccessGrant>>>) =>
    FORUM_ACCESS_ROLES.map((role) => ({
      role,
      ...DEFAULT_FORUM_ACCESS[role],
      ...(change[role] ?? {}),
    }));

  async function rested(userId: string) {
    await fixture.prisma.forumPostingCooldown.deleteMany({ where: { userId } });
  }

  async function open(author: string, forumId: string, title = 'Topic') {
    await rested(author);
    return (
      await topics.createTopic(author, {
        forumId,
        kind: 'DISCUSSION',
        title,
        documentJson: 'x',
      })
    ).topic;
  }

  it('hides a section from roles without view (404) and keeps supermoderators in', async () => {
    const { admin, categoryId, forumId } = await section();
    const author = await user();
    const topic = await open(author, forumId);
    await structure.saveSettings(admin, {
      categories: [],
      forums: [
        {
          id: forumId,
          input: forumInput(categoryId),
          access: matrix({ GUEST: none, MEMBER: none }),
        },
      ],
    });

    const member = await user();
    await expect(topics.topic(member, topic.id)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
    await expect(topics.topic(null, topic.id)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
    const tree = await structure.visibleTree(member);
    expect(
      tree.flatMap(({ forums }) => forums).some(({ id }) => id === forumId),
    ).toBe(false);

    const supermoderator = await user({
      accessRole: 'MODERATOR',
      moderatesAllCategories: true,
    });
    await expect(topics.topic(supermoderator, topic.id)).resolves.toMatchObject(
      { id: topic.id },
    );
    // A matrix that takes moderation away from moderators never narrows a
    // supermoderator's global powers.
    await moderation.pinTopic(supermoderator, topic.id, true);
  });

  it('inherits category → forum → subforum and reports the source', async () => {
    const { admin, categoryId, forumId } = await section();
    const sub = await structure.createForum(admin, {
      ...forumInput(categoryId, { parentId: forumId, slug: 'sub' }),
    });
    await structure.saveSettings(admin, {
      categories: [
        {
          id: categoryId,
          input: {
            slug: 'cat-' + randomUUID().slice(0, 6),
            title: 'Category',
            description: null,
            position: 0,
            visibility: 'PUBLIC',
            audienceKeys: [],
            active: true,
          },
          access: matrix({ MEMBER: { createTopics: false } }),
        },
      ],
      forums: [],
    });
    expect(
      (await structure.sectionAccess(admin, { forumId: sub.id })).source,
    ).toBe('CATEGORY');
    const member = await user();
    await rested(member);
    await expect(
      topics.createTopic(member, {
        forumId: sub.id,
        kind: 'DISCUSSION',
        title: 'Nope',
        documentJson: 'x',
      }),
    ).rejects.toMatchObject({ code: 'ACCESS_DENIED' });

    await structure.saveSettings(admin, {
      categories: [],
      forums: [
        {
          id: forumId,
          input: forumInput(categoryId),
          access: matrix({}),
        },
      ],
    });
    const access = await structure.sectionAccess(admin, { forumId: sub.id });
    expect(access.source).toBe('PARENT');
    expect(access.effective.MEMBER.createTopics).toBe(true);
    await expect(open(member, sub.id, 'Allowed now')).resolves.toBeDefined();

    await structure.saveSettings(admin, {
      categories: [],
      forums: [{ id: forumId, input: forumInput(categoryId), access: null }],
    });
    expect(
      (await structure.sectionAccess(admin, { forumId: sub.id })).source,
    ).toBe('CATEGORY');
  });

  it('applies the topic, reply, poll-free and pinned-limit switches', async () => {
    const { admin, categoryId, forumId } = await section();
    const member = await user();
    const topic = await open(member, forumId);
    const other = await open(admin, forumId, 'Second');
    await structure.saveSettings(admin, {
      categories: [],
      forums: [
        {
          id: forumId,
          input: forumInput(categoryId, {
            allowTopics: false,
            allowReplies: false,
            pinnedLimit: 1,
          }),
        },
      ],
    });
    await rested(member);
    await expect(
      topics.createTopic(member, {
        forumId,
        kind: 'DISCUSSION',
        title: 'Closed',
        documentJson: 'x',
      }),
    ).rejects.toMatchObject({ code: 'ACCESS_DENIED' });
    await expect(
      topics.reply(member, {
        topicId: topic.id,
        documentJson: 'r',
        replyToNumber: null,
        quotedNumbers: [],
      }),
    ).rejects.toMatchObject({ code: 'ACCESS_DENIED' });

    await moderation.pinTopic(admin, topic.id, true);
    await expect(
      moderation.pinTopic(admin, other.id, true),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  it('keeps unlisted sections out of lists and unsearchable ones out of search', async () => {
    const { admin, categoryId, forumId } = await section();
    const member = await user();
    const topic = await open(member, forumId, 'Needle unlisted');
    await structure.saveSettings(admin, {
      categories: [],
      forums: [
        {
          id: forumId,
          input: forumInput(categoryId, { listed: false, searchable: false }),
        },
      ],
    });
    const tree = await structure.visibleTree(member);
    expect(
      tree.flatMap(({ forums }) => forums).some(({ id }) => id === forumId),
    ).toBe(false);
    await expect(topics.topic(member, topic.id)).resolves.toMatchObject({
      id: topic.id,
    });
    const found = await search.search({
      term: 'Needle unlisted',
      page: 1,
      pageSize: 10,
      viewerId: member,
    });
    expect(found.items).toHaveLength(0);
    const managerTree = await structure.visibleTree(admin);
    expect(
      managerTree
        .flatMap(({ forums }) => forums)
        .find(({ id }) => id === forumId),
    ).toMatchObject({ listed: false, searchable: false });
  });

  it('lets a forum-level moderator moderate that forum only and audits saves', async () => {
    const { admin, categoryId, forumId } = await section();
    const sibling = await structure.createForum(admin, {
      ...forumInput(categoryId, { slug: 'sibling' }),
    });
    const moderator = await user();
    await structure.assignModerator(admin, categoryId, moderator, forumId);
    const author = await user();
    const mine = await open(author, forumId, 'Mine');
    const theirs = await open(author, sibling.id, 'Theirs');
    await moderation.pinTopic(moderator, mine.id, true);
    await expect(
      moderation.pinTopic(moderator, theirs.id, true),
    ).rejects.toMatchObject({ code: 'ACCESS_DENIED' });

    const before = await fixture.prisma.auditRecord.count({
      where: { targetId: forumId, action: 'forum.forum_updated' },
    });
    await structure.saveSettings(admin, {
      categories: [],
      forums: [
        { id: forumId, input: forumInput(categoryId), access: matrix({}) },
      ],
    });
    expect(
      await fixture.prisma.auditRecord.count({
        where: { targetId: forumId, action: 'forum.forum_updated' },
      }),
    ).toBe(before + 1);
    const member = await user();
    await expect(
      structure.saveSettings(member, { categories: [], forums: [] }),
    ).rejects.toMatchObject({ code: 'ACCESS_DENIED' });
  });

  it('seeds the contributor role next to the topic points rule', async () => {
    await expect(
      fixture.prisma.role.findUnique({ where: { name: 'contributor' } }),
    ).resolves.toMatchObject({ isSystem: true });
    await expect(
      fixture.prisma.communityPointRule.findUnique({
        where: { key: 'forum.topic.created' },
      }),
    ).resolves.toMatchObject({ eventName: 'forum.topic.created.v1' });
  });
});
