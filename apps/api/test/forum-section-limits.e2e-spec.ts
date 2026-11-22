/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Forum (Community Hub)
 * 📄 File: apps/api/test/forum-section-limits.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Migrated-schema proof of the part-B section settings: authors deleting
 * their own replies, attachment size/format limits, hidden-block rules
 * (who may add them, which kinds, who sees them unlocked) and the
 * auto-close of inactive topics. Documents use the real EditorDocument
 * shape (root node inside an object `content`).
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { randomUUID } from 'node:crypto';
import { AuditRedactionService, AuditWriterService } from '@api/core/audit';
import { OutboxWriterService } from '@api/core/events';
import type { EditorDocumentNormalizer } from '@api/modules/editor';
import type { ForumViewerFacts } from '@api/modules/forum';
import {
  DEFAULT_FORUM_ACCESS,
  FORUM_ACCESS_ROLES,
} from '@api/modules/forum/domain/forum-access.rules';
import { ForumAutoCloseService } from '@api/modules/forum/infrastructure/forum-auto-close.service';
import { ForumModerationService } from '@api/modules/forum/infrastructure/prisma-forum-moderation';
import { ForumStructureService } from '@api/modules/forum/infrastructure/prisma-forum-structure';
import { ForumTopicsService } from '@api/modules/forum/infrastructure/prisma-forum-topics';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

const doc = (...nodes: unknown[]) =>
  JSON.stringify({
    schemaVersion: 1,
    profile: 'FORUM_TOPIC',
    content: {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Body' }] },
        ...nodes,
      ],
    },
  });
const gate = (...nodes: unknown[]) => ({
  type: 'contentGate',
  attrs: { gateId: randomUUID() },
  content: nodes,
});
const file = (mediaId: string) => ({ type: 'attachment', attrs: { mediaId } });

describe('Forum section limits (e2e)', () => {
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let structure: ForumStructureService;
  let topics: ForumTopicsService;
  let moderation: ForumModerationService;
  let autoClose: ForumAutoCloseService;
  const facts = new Map<string, Partial<ForumViewerFacts>>();
  const files = new Map<string, { extension: string; size: number }>();
  const projectedFor: Array<string | null> = [];

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
          Promise.resolve({
            documentJson,
            gates: [{ allowed: true }] as never,
          }),
      },
      {
        project: (documentJson, viewerId) => {
          projectedFor.push(viewerId);
          return Promise.resolve({ documentJson });
        },
      },
      {
        activeMediaIds: () => Promise.resolve([]),
        rejectedForActor: () => Promise.resolve([]),
        files: (_actor, ids) =>
          Promise.resolve(
            ids.map((mediaId) => ({ mediaId, ...files.get(mediaId)! })),
          ),
        sync: () => Promise.resolve(),
        attachments: () => Promise.resolve([]),
      },
    );
    moderation = new ForumModerationService(
      fixture.prisma,
      audit,
      outbox,
      viewers,
      topics,
    );
    autoClose = new ForumAutoCloseService(fixture.prisma, audit, outbox);
  }, 60000);

  afterAll(async () => {
    await fixture?.close();
  });

  async function user(viewer: Partial<ForumViewerFacts> = {}) {
    const id = randomUUID();
    await fixture.prisma.user.create({
      data: {
        id,
        email: `lim-${id}@dss.test`,
        username: `lim-${id.slice(0, 8)}`,
        passwordHash: 'fixture-hash',
      },
    });
    facts.set(id, viewer);
    return id;
  }

  async function section(
    change: Record<string, unknown> = {},
    access?: unknown,
  ) {
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
    const input = {
      categoryId: category.id,
      parentId: null,
      slug: 'f-' + randomUUID().slice(0, 6),
      title: 'Forum',
      description: null,
      position: 0,
      allowsGatedContent: true,
      active: true,
    };
    const forum = await structure.createForum(admin, input);
    await structure.saveSettings(admin, {
      categories: [],
      forums: [
        {
          id: forum.id,
          input: { ...input, ...change },
          access: access as never,
        },
      ],
    });
    return { admin, forumId: forum.id };
  }

  async function rested(userId: string) {
    await fixture.prisma.forumPostingCooldown.deleteMany({ where: { userId } });
  }
  async function open(author: string, forumId: string, body = doc()) {
    await rested(author);
    return (
      await topics.createTopic(author, {
        forumId,
        kind: 'DISCUSSION',
        title: 'Topic ' + randomUUID().slice(0, 4),
        documentJson: body,
      })
    ).topic;
  }
  async function reply(author: string, topicId: string, body = doc()) {
    await rested(author);
    return topics.reply(author, {
      topicId,
      documentJson: body,
      replyToNumber: null,
      quotedNumbers: [],
    });
  }

  it('lets authors delete their own replies only where the matrix allows', async () => {
    const access = FORUM_ACCESS_ROLES.map((role) => ({
      role,
      ...DEFAULT_FORUM_ACCESS[role],
      ...(role === 'MEMBER' ? { deleteOwn: true } : {}),
    }));
    const { forumId } = await section({}, access);
    const author = await user();
    const topic = await open(author, forumId);
    const mine = await reply(author, topic.id);
    const stranger = await user();
    await expect(
      moderation.deleteOwnPost(stranger, mine.id),
    ).rejects.toMatchObject({ code: 'ACCESS_DENIED' });
    await expect(moderation.deleteOwnPost(author, mine.id)).resolves.toEqual({
      postId: mine.id,
      state: 'DELETED',
    });
    const first = await fixture.prisma.forumPost.findFirstOrThrow({
      where: { topicId: topic.id, number: 1 },
    });
    await expect(
      moderation.deleteOwnPost(author, first.id),
    ).rejects.toMatchObject({ code: 'ACCESS_DENIED' });

    const { forumId: plain } = await section();
    const other = await open(author, plain);
    const kept = await reply(author, other.id);
    await expect(
      moderation.deleteOwnPost(author, kept.id),
    ).rejects.toMatchObject({ code: 'ACCESS_DENIED' });
  });

  it('enforces attachment size and formats', async () => {
    const { forumId } = await section({
      attachmentMaxMb: 1,
      attachmentFormats: ['pdf'],
    });
    const member = await user();
    const big = randomUUID();
    const exe = randomUUID();
    const ok = randomUUID();
    files.set(big, { extension: 'pdf', size: 2 * 1024 * 1024 });
    files.set(exe, { extension: 'exe', size: 10 });
    files.set(ok, { extension: 'pdf', size: 1000 });
    await expect(open(member, forumId, doc(file(big)))).rejects.toThrow(/MB/);
    await expect(open(member, forumId, doc(file(exe)))).rejects.toThrow(
      /format/,
    );
    await expect(open(member, forumId, doc(file(ok)))).resolves.toBeDefined();

    const { forumId: closed } = await section({ allowAttachments: false });
    await expect(open(member, closed, doc(file(ok)))).rejects.toThrow(
      /Attachments/,
    );
  });

  it('applies hidden-block rules, including real document shapes', async () => {
    const member = await user();
    const contributor = await user({ accessRole: 'CONTRIBUTOR' });
    const { forumId: plain } = await section({ allowsGatedContent: false });
    await expect(
      open(member, plain, doc(gate({ type: 'paragraph' }))),
    ).rejects.toThrow(/Hidden content is allowed only/);

    const { forumId } = await section({
      gateCreateRole: 'CONTRIBUTOR',
      gateBlockTypes: ['TEXT'],
      gateViewRole: 'CONTRIBUTOR',
    });
    await expect(
      open(member, forumId, doc(gate({ type: 'paragraph' }))),
    ).rejects.toMatchObject({ code: 'ACCESS_DENIED' });
    await expect(
      open(contributor, forumId, doc(gate({ type: 'codeBlock' }))),
    ).rejects.toThrow(/cannot contain/);
    const topic = await open(
      contributor,
      forumId,
      doc(gate({ type: 'paragraph' })),
    );

    projectedFor.length = 0;
    await topics.posts(member, topic.id, 1, 20);
    await topics.posts(contributor, topic.id, 1, 20);
    expect(projectedFor).toEqual([null, contributor]);
  });

  it('auto-closes inactive open topics and audits it as the system', async () => {
    const { forumId } = await section({ autoCloseDays: 7 });
    const member = await user();
    const stale = await open(member, forumId);
    const fresh = await open(member, forumId);
    await fixture.prisma.forumTopic.update({
      where: { id: stale.id },
      data: { lastPostAt: new Date(Date.now() - 8 * 86_400_000) },
    });
    expect(await autoClose.closeInactive()).toBeGreaterThanOrEqual(1);
    const [a, b] = await Promise.all([
      fixture.prisma.forumTopic.findUniqueOrThrow({ where: { id: stale.id } }),
      fixture.prisma.forumTopic.findUniqueOrThrow({ where: { id: fresh.id } }),
    ]);
    expect([a.state, b.state]).toEqual(['CLOSED', 'OPEN']);
    await expect(
      fixture.prisma.auditRecord.findFirst({
        where: { targetId: stale.id, action: 'forum.topic_closed' },
      }),
    ).resolves.toMatchObject({ actorType: 'SYSTEM' });
  });
});
