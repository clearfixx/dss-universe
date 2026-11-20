/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Forum (Community Hub)
 * 📄 File: apps/api/test/forum-structure.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Verifies the CH-0 forum structure against migrated PostgreSQL.
 *
 * ⚠️ Important:
 * Uses an isolated schema in the disposable dss_test database only.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { randomUUID } from 'node:crypto';
import { AuditRedactionService, AuditWriterService } from '@api/core/audit';
import { OutboxWriterService } from '@api/core/events';
import type { ForumViewerFacts } from '@api/modules/forum';
import { ForumStructureService } from '@api/modules/forum/infrastructure/prisma-forum-structure';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

describe('Forum structure (e2e)', () => {
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let forum: ForumStructureService;
  const facts = new Map<string, Partial<ForumViewerFacts>>();

  beforeAll(async () => {
    fixture = await createIsolatedApiSchemaFixture();
    forum = new ForumStructureService(
      fixture.prisma,
      new AuditWriterService(new AuditRedactionService()),
      new OutboxWriterService(),
      {
        read: (subjectId) =>
          Promise.resolve({
            subjectId,
            audienceKeys: [],
            seesAllCategories: false,
            moderatesAllCategories: false,
            canAssignModerators: false,
            ...(subjectId ? facts.get(subjectId) : {}),
          }),
      },
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
        email: `forum-${id}@dss.test`,
        username: `forum-${id}`,
        passwordHash: 'fixture-hash',
      },
    });
    facts.set(id, viewer);
    return id;
  }

  const admin = () =>
    user({ seesAllCategories: true, canAssignModerators: true });

  const category = (
    slug: string,
    visibility: 'PUBLIC' | 'MEMBERS' | 'RESTRICTED' = 'PUBLIC',
    audienceKeys: string[] = [],
  ) => ({
    slug,
    title: 'Category ' + slug,
    description: null,
    position: 0,
    visibility,
    audienceKeys,
    active: true,
  });

  const forumInput = (
    categoryId: string,
    slug: string,
    parentId: string | null = null,
  ) => ({
    categoryId,
    parentId,
    slug,
    title: 'Forum ' + slug,
    description: null,
    position: 0,
    allowsGatedContent: false,
    active: true,
  });

  const unique = () => randomUUID().slice(0, 8);

  it('builds category → forum → subforum with audit and Outbox evidence', async () => {
    const actor = await admin();
    const created = await forum.createCategory(
      actor,
      category('c-' + unique()),
    );
    const parent = await forum.createForum(
      actor,
      forumInput(created.id, 'parent'),
    );
    const child = await forum.createForum(
      actor,
      forumInput(created.id, 'child', parent.id),
    );
    expect(child.parentId).toBe(parent.id);
    const tree = await forum.visibleTree(null);
    const node = tree.find(({ id }) => id === created.id)!;
    expect(node.audienceKeys).toBeNull();
    expect(node.forums).toHaveLength(1);
    expect(node.forums[0].subforums.map(({ id }) => id)).toEqual([child.id]);
    await expect(
      fixture.prisma.outboxEvent.count({
        where: { eventName: 'forum.forum.created.v1', actorId: actor },
      }),
    ).resolves.toBe(2);
  });

  it('allows one level of subforums only, inside the parent category', async () => {
    const actor = await admin();
    const first = await forum.createCategory(actor, category('a-' + unique()));
    const second = await forum.createCategory(actor, category('b-' + unique()));
    const parent = await forum.createForum(actor, forumInput(first.id, 'p'));
    const child = await forum.createForum(
      actor,
      forumInput(first.id, 'c', parent.id),
    );
    await expect(
      forum.createForum(actor, forumInput(first.id, 'g', child.id)),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' });
    await expect(
      forum.createForum(actor, forumInput(second.id, 'x', parent.id)),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' });
    await expect(
      forum.updateForum(actor, parent.id, forumInput(first.id, 'p', child.id)),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' });
    await expect(
      fixture.prisma.forum.create({
        data: {
          categoryId: first.id,
          parentId: child.id,
          slug: 'raw-grandchild',
          title: 'Raw grandchild',
        },
      }),
    ).rejects.toThrow();
  });

  it('hides restricted and member categories from viewers without access', async () => {
    const actor = await admin();
    const restricted = await forum.createCategory(
      actor,
      category('r-' + unique(), 'RESTRICTED', ['group:premium']),
    );
    const members = await forum.createCategory(
      actor,
      category('m-' + unique(), 'MEMBERS'),
    );
    const premium = await user({ audienceKeys: ['group:premium'] });
    const ordinary = await user({ audienceKeys: ['role:user'] });

    const ids = async (viewer: string | null) =>
      (await forum.visibleTree(viewer)).map(({ id }) => id);

    expect(await ids(null)).not.toEqual(
      expect.arrayContaining([restricted.id]),
    );
    expect(await ids(null)).not.toEqual(expect.arrayContaining([members.id]));
    expect(await ids(ordinary)).toEqual(expect.arrayContaining([members.id]));
    expect(await ids(ordinary)).not.toEqual(
      expect.arrayContaining([restricted.id]),
    );
    expect(await ids(premium)).toEqual(
      expect.arrayContaining([restricted.id, members.id]),
    );
    const adminView = (await forum.visibleTree(actor)).find(
      ({ id }) => id === restricted.id,
    );
    expect(adminView?.audienceKeys).toEqual(['group:premium']);
    await expect(
      forum.moderators(ordinary, restricted.id),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('keeps administrators able to see a restricted category with no audience', async () => {
    const actor = await admin();
    const hidden = await forum.createCategory(
      actor,
      category('h-' + unique(), 'RESTRICTED'),
    );
    const member = await user({ audienceKeys: ['role:user'] });
    expect((await forum.visibleTree(actor)).map(({ id }) => id)).toContain(
      hidden.id,
    );
    expect((await forum.visibleTree(member)).map(({ id }) => id)).not.toContain(
      hidden.id,
    );
  });

  it('assigns category moderators across several categories and revokes them', async () => {
    const actor = await admin();
    const moderator = await user();
    const first = await forum.createCategory(actor, category('x-' + unique()));
    const second = await forum.createCategory(actor, category('y-' + unique()));
    const a = await forum.assignModerator(actor, first.id, moderator);
    await forum.assignModerator(actor, second.id, moderator);
    await expect(forum.canModerateCategory(moderator, first.id)).resolves.toBe(
      true,
    );
    await expect(
      forum.assignModerator(actor, first.id, moderator),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
    await forum.revokeModerator(actor, a.id);
    await expect(forum.canModerateCategory(moderator, first.id)).resolves.toBe(
      false,
    );
    await expect(forum.canModerateCategory(moderator, second.id)).resolves.toBe(
      true,
    );
    const again = await forum.assignModerator(actor, first.id, moderator);
    expect(again.revokedAt).toBeNull();
  });

  it('gives supermoderators every category without assignments', async () => {
    const actor = await admin();
    const supermoderator = await user({ moderatesAllCategories: true });
    const created = await forum.createCategory(
      actor,
      category('s-' + unique()),
    );
    await expect(
      forum.canModerateCategory(supermoderator, created.id),
    ).resolves.toBe(true);
  });

  it('rejects structure changes without permissions and duplicate slugs', async () => {
    const actor = await admin();
    const member = await user();
    await expect(
      forum.createCategory(member, category('z-' + unique())),
    ).rejects.toMatchObject({ code: 'ACCESS_DENIED' });
    await expect(
      forum.assignModerator(member, randomUUID(), member),
    ).rejects.toMatchObject({ code: 'ACCESS_DENIED' });
    const slug = 'dup-' + unique();
    await forum.createCategory(actor, category(slug));
    await expect(
      forum.createCategory(actor, category(slug)),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
  });
});
