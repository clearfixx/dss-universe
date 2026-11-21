/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Forum (Community Hub)
 * 📄 File: apps/api/test/forum-gated-content.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Verifies CH-3b Content Gates in forum posts against migrated PostgreSQL:
 * forum opt-in, author access, viewer redaction and safe editing.
 *
 * ⚠️ Important:
 * Uses an isolated schema in the disposable dss_test database only. Gate
 * decisions and redaction are Editor-owned and stubbed at their contracts.
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
import { ForumStructureService } from '@api/modules/forum/infrastructure/prisma-forum-structure';
import { ForumTopicsService } from '@api/modules/forum/infrastructure/prisma-forum-topics';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

describe('Forum gated content (e2e)', () => {
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let structure: ForumStructureService;
  let topics: ForumTopicsService;
  const facts = new Map<string, Partial<ForumViewerFacts>>();
  const unlocked = new Set<string>();
  const SECRET = 'top secret answer';

  const gatedDocument = () => ({
    ...createEmptyEditorDocument('FORUM_TOPIC'),
    content: [
      {
        type: 'contentGate',
        attrs: { gateId: randomUUID() },
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: SECRET }] },
        ],
      },
    ],
  });

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
      const document =
        json === 'GATED'
          ? gatedDocument()
          : createEmptyEditorDocument('FORUM_REPLY');
      return {
        document,
        canonicalJson: JSON.stringify(document),
        plainText: json === 'GATED' ? SECRET : 'Plain ' + json,
        searchText: 'text',
      } as ReturnType<EditorDocumentNormalizer['normalizeForumReply']>;
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
        project: (documentJson, viewerId) =>
          Promise.resolve({
            documentJson,
            gates: [
              {
                gateId: 'g',
                allowed: unlocked.has(viewerId),
                bypassed: false,
                unmet: [],
                notice: '',
              },
            ],
          }),
      },
      {
        project: (documentJson, viewerId) =>
          Promise.resolve({
            documentJson:
              viewerId && unlocked.has(viewerId)
                ? documentJson
                : documentJson.replace(SECRET, '[locked]'),
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
        email: `gate-${id}@dss.test`,
        username: `gate-${id}`,
        passwordHash: 'fixture-hash',
      },
    });
    facts.set(id, viewer);
    return id;
  }

  async function forum(allowsGatedContent: boolean) {
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
      slug: 'secrets',
      title: 'Secrets',
      description: null,
      position: 0,
      allowsGatedContent,
      active: true,
    });
    return { forumId: created.id, categoryId: category.id, admin };
  }

  it('rejects hidden content outside forums enabled for it', async () => {
    const { forumId } = await forum(false);
    const author = await user();
    unlocked.add(author);
    await expect(
      topics.createTopic(author, {
        forumId,
        kind: 'DISCUSSION',
        title: 'Not allowed here',
        documentJson: 'GATED',
      }),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  });

  it('requires the author to read every hidden block they save', async () => {
    const { forumId } = await forum(true);
    const outsider = await user();
    await expect(
      topics.createTopic(outsider, {
        forumId,
        kind: 'DISCUSSION',
        title: 'Borrowed gate',
        documentJson: 'GATED',
      }),
    ).rejects.toMatchObject({ code: 'ACCESS_DENIED' });
  });

  it('redacts hidden blocks per viewer and never for authorized viewers', async () => {
    const { forumId } = await forum(true);
    const author = await user();
    unlocked.add(author);
    const { topic } = await topics.createTopic(author, {
      forumId,
      kind: 'DISCUSSION',
      title: 'Gated topic',
      documentJson: 'GATED',
    });
    const guest = (await topics.posts(null, topic.id, 1, 20)).items[0];
    expect(guest.documentJson).not.toContain(SECRET);
    expect(guest.documentJson).toContain('[locked]');
    const member = await user();
    const locked = (await topics.posts(member, topic.id, 1, 20)).items[0];
    expect(locked.documentJson).not.toContain(SECRET);
    unlocked.add(member);
    const opened = (await topics.posts(member, topic.id, 1, 20)).items[0];
    expect(opened.documentJson).toContain(SECRET);
  });

  it('prevents a moderator without access from overwriting hidden blocks', async () => {
    const { forumId, categoryId, admin } = await forum(true);
    const author = await user();
    unlocked.add(author);
    const { firstPostId } = await topics.createTopic(author, {
      forumId,
      kind: 'DISCUSSION',
      title: 'Protected edit',
      documentJson: 'GATED',
    });
    const moderator = await user();
    await structure.assignModerator(admin, categoryId, moderator);
    await expect(
      topics.editPost(moderator, {
        postId: firstPostId,
        expectedRevision: 1,
        documentJson: 'plain rewrite',
      }),
    ).rejects.toMatchObject({ code: 'ACCESS_DENIED' });
    unlocked.add(moderator);
    await expect(
      topics.editPost(moderator, {
        postId: firstPostId,
        expectedRevision: 1,
        documentJson: 'GATED',
      }),
    ).resolves.toMatchObject({ revision: 2 });
  });

  it('still rejects media until shared media references exist', async () => {
    const { forumId } = await forum(true);
    const author = await user();
    const mediaTopics = new ForumTopicsService(
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
            canPurgeContent: false,
          }),
      },
      {
        normalizeForumTopic: () => {
          const document = {
            ...createEmptyEditorDocument('FORUM_TOPIC'),
            content: [
              {
                type: 'attachment',
                attrs: { mediaId: randomUUID(), label: 'file' },
              },
            ],
          };
          return {
            document,
            canonicalJson: JSON.stringify(document),
            plainText: 'file',
            searchText: 'file',
          };
        },
      } as unknown as EditorDocumentNormalizer,
      structure,
      {
        project: (documentJson) => Promise.resolve({ documentJson, gates: [] }),
      },
      { project: (documentJson) => Promise.resolve({ documentJson }) },
    );
    await expect(
      mediaTopics.createTopic(author, {
        forumId,
        kind: 'DISCUSSION',
        title: 'With media',
        documentJson: 'x',
      }),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  });
});
