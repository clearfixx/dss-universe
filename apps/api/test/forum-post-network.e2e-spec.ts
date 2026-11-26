/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Forum (Community Hub)
 * 📄 File: apps/api/test/forum-post-network.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Migrated-schema proof of post network metadata (P1 B11, owner decision
 * D6): capture on write, staff-only audited reads without copying the
 * address into the audit, and manual erasure with a reason.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { randomUUID } from 'node:crypto';
import { AuditRedactionService, AuditWriterService } from '@api/core/audit';
import { OutboxWriterService } from '@api/core/events';
import type { EditorDocumentNormalizer } from '@api/modules/editor';
import type { ForumViewerFacts } from '@api/modules/forum';
import { ForumPostNetworkService } from '@api/modules/forum/infrastructure/prisma-forum-post-network';
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
const CHROME =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

describe('Forum post network metadata (e2e)', () => {
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let structure: ForumStructureService;
  let topics: ForumTopicsService;
  let network: ForumPostNetworkService;
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
    network = new ForumPostNetworkService(
      fixture.prisma,
      audit,
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
        email: `net-${id}@dss.test`,
        username: `net-${id.slice(0, 8)}`,
        passwordHash: 'fixture-hash',
      },
    });
    facts.set(id, viewer);
    return id;
  }

  async function forum() {
    const admin = await user({ accessRole: 'ADMIN', seesAllCategories: true });
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
      slug: 'f-' + randomUUID().slice(0, 6),
      title: 'Forum',
      description: null,
      position: 0,
      allowsGatedContent: false,
      active: true,
    });
    return created.id;
  }

  it('captures, shows only to staff, audits reads and erases with a reason', async () => {
    const forumId = await forum();
    const author = await user();
    const { firstPostId } = await topics.createTopic(
      author,
      {
        forumId,
        kind: 'DISCUSSION',
        title: 'Network topic',
        documentJson: doc,
      },
      { ipAddress: '::ffff:203.0.113.7', userAgent: CHROME },
    );
    const stored = await fixture.prisma.forumPostNetwork.findUniqueOrThrow({
      where: { postId: firstPostId },
    });
    expect(stored.ipAddress).toBe('203.0.113.7');

    await expect(network.read(author, firstPostId)).rejects.toMatchObject({
      code: 'ACCESS_DENIED',
    });

    const moderator = await user({ canViewNetwork: true });
    const seen = await network.read(moderator, firstPostId);
    expect(seen).toMatchObject({
      ipAddress: '203.0.113.7',
      userAgent: CHROME,
      device: { kind: 'DESKTOP', browser: 'Chrome 131', os: 'Windows' },
    });
    const audits = await fixture.prisma.auditRecord.findMany({
      where: { action: 'forum.post_network_viewed', targetId: firstPostId },
    });
    expect(audits).toHaveLength(1);
    expect(audits[0].actorId).toBe(moderator);
    expect(JSON.stringify(audits[0].metadata)).not.toContain('203.0.113.7');

    await expect(
      network.erase(moderator, firstPostId, 'Not allowed'),
    ).rejects.toMatchObject({ code: 'ACCESS_DENIED' });
    const admin = await user({ canViewNetwork: true, canDeleteNetwork: true });
    await expect(network.erase(admin, firstPostId, '  ')).rejects.toThrow();
    await expect(
      network.erase(admin, firstPostId, 'Retention request'),
    ).resolves.toBe(true);
    await expect(network.read(admin, firstPostId)).resolves.toBeNull();
    const deleted = await fixture.prisma.auditRecord.findFirstOrThrow({
      where: { action: 'forum.post_network_deleted', targetId: firstPostId },
    });
    expect(deleted.reason).toBe('Retention request');
  });

  it('stores nothing when the client is unknown and keeps replies separate', async () => {
    const forumId = await forum();
    const author = await user();
    const { topic, firstPostId } = await topics.createTopic(author, {
      forumId,
      kind: 'DISCUSSION',
      title: 'No client',
      documentJson: doc,
    });
    await expect(
      fixture.prisma.forumPostNetwork.count({ where: { postId: firstPostId } }),
    ).resolves.toBe(0);
    await fixture.prisma.forumPostingCooldown.deleteMany({
      where: { userId: author },
    });
    const reply = await topics.reply(
      author,
      {
        topicId: topic.id,
        documentJson: doc,
        replyToNumber: null,
        quotedNumbers: [],
      },
      { ipAddress: '198.51.100.4', userAgent: null },
    );
    const row = await fixture.prisma.forumPostNetwork.findUniqueOrThrow({
      where: { postId: reply.id },
    });
    expect(row).toMatchObject({ ipAddress: '198.51.100.4', userAgent: null });
  });
});
