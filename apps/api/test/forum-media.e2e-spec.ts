/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Forum (Community Hub) × Media
 * 📄 File: apps/api/test/forum-media.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Verifies CH-3c Media in forum posts through the shared document reference
 * pieces against migrated PostgreSQL.
 *
 * ⚠️ Important:
 * Uses an isolated schema in the disposable dss_test database only.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { randomUUID } from 'node:crypto';
import { createEmptyEditorDocument, type EditorDocument } from '@dss/editor';
import { AuditRedactionService, AuditWriterService } from '@api/core/audit';
import { OutboxWriterService } from '@api/core/events';
import type { EditorDocumentNormalizer } from '@api/modules/editor';
import type { ForumViewerFacts } from '@api/modules/forum';
import { ForumModerationService } from '@api/modules/forum/infrastructure/prisma-forum-moderation';
import { ForumStructureService } from '@api/modules/forum/infrastructure/prisma-forum-structure';
import { ForumTopicsService } from '@api/modules/forum/infrastructure/prisma-forum-topics';
import { ForumPostMediaResolver } from '@api/modules/forum/presentation/forum-topics.resolver';
import { PrismaMediaAttachmentPolicy } from '@api/modules/media/infrastructure/repositories/prisma-media-attachment-policy';
import { PrismaPublicAttachmentReader } from '@api/modules/media/infrastructure/repositories/prisma-public-attachment.reader';
import { ForumPostMediaAdapter } from '../src/composition/media-references/infrastructure/forum-post-media.adapter';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

describe('Forum post media (e2e)', () => {
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let structure: ForumStructureService;
  let topics: ForumTopicsService;
  let moderation: ForumModerationService;
  let media: ForumPostMediaAdapter;
  const facts = new Map<string, Partial<ForumViewerFacts>>();

  function documentWith(mediaIds: string[]): EditorDocument {
    const empty = createEmptyEditorDocument('FORUM_REPLY');
    return {
      ...empty,
      content: {
        type: 'doc',
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: 'See files' }] },
          ...mediaIds.map((mediaId) => ({
            type: 'attachment',
            attrs: { mediaId, label: 'file' },
          })),
        ],
      },
    };
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
    // Test documents are passed as JSON arrays of media IDs.
    const normalize = (json: string) => {
      const document = documentWith(JSON.parse(json) as string[]);
      return {
        document,
        canonicalJson: JSON.stringify(document),
        plainText: 'See files',
        searchText: 'see files',
      };
    };
    const editor = {
      normalizeForumTopic: normalize,
      normalizeForumReply: normalize,
    } as unknown as EditorDocumentNormalizer;
    media = new ForumPostMediaAdapter(
      fixture.prisma,
      new PrismaMediaAttachmentPolicy(fixture.prisma),
      new PrismaPublicAttachmentReader(fixture.prisma),
    );
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
      media,
    );
    moderation = new ForumModerationService(
      fixture.prisma,
      audit,
      outbox,
      viewers,
      topics,
      media,
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
        email: `fmedia-${id}@dss.test`,
        username: `fmedia-${id}`,
        passwordHash: 'fixture-hash',
      },
    });
    facts.set(id, viewer);
    return id;
  }

  async function file(
    ownerId: string | null,
    visibility: 'PUBLIC' | 'PRIVATE' = 'PUBLIC',
    status: 'READY' | 'PENDING' = 'READY',
  ) {
    const key = randomUUID();
    const row = await fixture.prisma.media.create({
      data: {
        ownerId,
        kind: 'DOCUMENT',
        status,
        visibility,
        storageProvider: 'LOCAL',
        bucket: 'forum-media-fixture',
        storageKey: key,
        originalFilename: `file-${key.slice(0, 6)}.pdf`,
        mimeType: 'application/pdf',
        extension: 'pdf',
        size: 1234,
        checksum: key,
      },
    });
    return row.id;
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
      slug: 'f',
      title: 'Forum',
      description: null,
      position: 0,
      allowsGatedContent: false,
      active: true,
    });
    const moderator = await user();
    await structure.assignModerator(admin, category.id, moderator);
    const author = await user();
    const { topic } = await topics.createTopic(author, {
      forumId: forum.id,
      kind: 'DISCUSSION',
      title: 'Files',
      documentJson: '[]',
    });
    return { admin, moderator, author, topic };
  }

  const active = async (postId: string) =>
    (await media.activeMediaIds(postId)).sort();

  it('references own and public READY files and delivers only public ones', async () => {
    const s = await scene();
    const replier = await user();
    const own = await file(replier, 'PRIVATE');
    const shared = await file(s.author, 'PUBLIC');
    const post = await topics.reply(replier, {
      topicId: s.topic.id,
      documentJson: JSON.stringify([own, shared]),
      replyToNumber: null,
      quotedNumbers: [],
    });
    expect(await active(post.id)).toEqual([own, shared].sort());
    const resolver = new ForumPostMediaResolver(media);
    const attachments = await resolver.attachments({
      id: post.id,
      documentJson: JSON.stringify(documentWith([own, shared])),
    } as never);
    expect(attachments.map(({ mediaId }) => mediaId)).toEqual([shared]);
    expect(attachments[0]).toMatchObject({
      mimeType: 'application/pdf',
      size: 1234,
      downloadUrl: `/api/media/public/${shared}/original`,
    });
    // Files of blocks removed from the viewer's document are never listed.
    await expect(
      resolver.attachments({
        id: post.id,
        documentJson: JSON.stringify(documentWith([])),
      } as never),
    ).resolves.toEqual([]);
  });

  it('rejects files that are not ready or belong privately to someone else', async () => {
    const s = await scene();
    const replier = await user();
    for (const mediaId of [
      await file(replier, 'PRIVATE', 'PENDING'),
      await file(s.author, 'PRIVATE'),
      randomUUID(),
    ]) {
      await expect(
        topics.reply(replier, {
          topicId: s.topic.id,
          documentJson: JSON.stringify([mediaId]),
          replyToNumber: null,
          quotedNumbers: [],
        }),
      ).rejects.toMatchObject({ code: 'INVALID_INPUT' });
    }
  });

  it('lets a moderator keep the author’s private file but not add another one', async () => {
    const s = await scene();
    const authorPrivate = await file(s.author, 'PRIVATE');
    const posts = await fixture.prisma.forumPost.findFirstOrThrow({
      where: { topicId: s.topic.id, number: 1 },
    });
    const withFile = await topics.editPost(s.author, {
      postId: posts.id,
      expectedRevision: posts.revision,
      documentJson: JSON.stringify([authorPrivate]),
    });
    expect(await active(posts.id)).toEqual([authorPrivate]);
    const edited = await topics.editPost(s.moderator, {
      postId: posts.id,
      expectedRevision: withFile.revision,
      documentJson: JSON.stringify([authorPrivate]),
    });
    expect(await active(posts.id)).toEqual([authorPrivate]);
    const strangerPrivate = await file(s.author, 'PRIVATE');
    await expect(
      topics.editPost(s.moderator, {
        postId: posts.id,
        expectedRevision: edited.revision,
        documentJson: JSON.stringify([authorPrivate, strangerPrivate]),
      }),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' });
    // Removing a file from the document releases only that reference.
    await topics.editPost(s.moderator, {
      postId: posts.id,
      expectedRevision: edited.revision,
      documentJson: '[]',
    });
    expect(await active(posts.id)).toEqual([]);
    await expect(
      fixture.prisma.media.count({ where: { id: authorPrivate } }),
    ).resolves.toBe(1);
  });

  it('keeps references through hide and delete and releases them only on purge', async () => {
    const s = await scene();
    const replier = await user();
    const shared = await file(replier);
    const post = await topics.reply(replier, {
      topicId: s.topic.id,
      documentJson: JSON.stringify([shared]),
      replyToNumber: null,
      quotedNumbers: [],
    });
    await moderation.hidePost(s.moderator, post.id, 'Check the license');
    expect(await active(post.id)).toEqual([shared]);
    await moderation.restorePost(s.moderator, post.id);
    await moderation.deletePost(s.moderator, post.id, 'Duplicate');
    expect(await active(post.id)).toEqual([shared]);
    await moderation.purgePost(s.admin, post.id, 'Legal request');
    expect(await active(post.id)).toEqual([]);
    await expect(
      fixture.prisma.media.count({ where: { id: shared } }),
    ).resolves.toBe(1);
  });
});
