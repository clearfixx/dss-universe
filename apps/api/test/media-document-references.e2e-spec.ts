/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media Reference Composition
 * 📄 File: apps/api/test/media-document-references.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Proves the shared document Media reference sync and the Media attach
 * policy against migrated PostgreSQL.
 *
 * ⚠️ Important:
 * Uses an isolated schema in the disposable dss_test database only.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { randomUUID } from 'node:crypto';
import { PrismaMediaAttachmentPolicy } from '@api/modules/media/infrastructure/repositories/prisma-media-attachment-policy';
import { syncDocumentMediaReferences } from '../src/composition/media-references/sync-document-media-references';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

describe('Shared document Media references (e2e)', () => {
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let policy: PrismaMediaAttachmentPolicy;

  beforeAll(async () => {
    fixture = await createIsolatedApiSchemaFixture();
    policy = new PrismaMediaAttachmentPolicy(fixture.prisma);
  }, 60000);

  afterAll(async () => {
    await fixture?.close();
  });

  async function user() {
    const id = randomUUID();
    await fixture.prisma.user.create({
      data: {
        id,
        email: `media-${id}@dss.test`,
        username: `media-${id}`,
        passwordHash: 'fixture-hash',
      },
    });
    return id;
  }

  async function media(
    ownerId: string | null,
    status: 'READY' | 'PENDING' = 'READY',
    visibility: 'PUBLIC' | 'PRIVATE' = 'PRIVATE',
  ) {
    const key = randomUUID();
    const row = await fixture.prisma.media.create({
      data: {
        ownerId,
        kind: 'DOCUMENT',
        status,
        visibility,
        storageProvider: 'LOCAL',
        bucket: 'references-fixture',
        storageKey: key,
        originalFilename: 'fixture.pdf',
        mimeType: 'application/pdf',
        extension: 'pdf',
        size: 100,
        checksum: key,
      },
    });
    return row.id;
  }

  async function active(scope: {
    targetType: string;
    targetId: string;
    purpose: string;
  }) {
    const rows = await fixture.prisma.mediaReference.findMany({
      where: { ...scope, removedAt: null },
      select: { mediaId: true },
    });
    return rows.map(({ mediaId }) => mediaId).sort();
  }

  const sync = (
    scope: { targetType: string; targetId: string; purpose: string },
    actorId: string,
    ids: string[],
  ) =>
    fixture.prisma.$transaction((tx) =>
      syncDocumentMediaReferences(tx, scope, actorId, ids),
    );

  it('keeps the active set exact: add, repeat, remove, empty and restore', async () => {
    const actor = await user();
    const [a, b, c] = [
      await media(actor),
      await media(actor),
      await media(actor),
    ];
    const scope = {
      targetType: 'ForumPost',
      targetId: randomUUID(),
      purpose: 'forum.post.media',
    };
    await sync(scope, actor, [a, b, a]);
    expect(await active(scope)).toEqual([a, b].sort());
    await sync(scope, actor, [a, b]);
    expect(await fixture.prisma.mediaReference.count({ where: scope })).toBe(2);
    await sync(scope, actor, [b, c]);
    expect(await active(scope)).toEqual([b, c].sort());
    await sync(scope, actor, []);
    expect(await active(scope)).toEqual([]);
    await sync(scope, actor, [a]);
    expect(await active(scope)).toEqual([a]);
    // Restored, not duplicated.
    expect(
      await fixture.prisma.mediaReference.count({
        where: { ...scope, mediaId: a },
      }),
    ).toBe(1);
  });

  it('never touches another scope that references the same file', async () => {
    const actor = await user();
    const shared = await media(actor);
    const revision1 = {
      targetType: 'ResearchRevision',
      targetId: randomUUID(),
      purpose: 'research.revision.media',
    };
    const revision2 = { ...revision1, targetId: randomUUID() };
    const news = {
      targetType: 'NewsArticle',
      targetId: randomUUID(),
      purpose: 'news.attachment',
    };
    const otherPurpose = { ...news, purpose: 'news.cover' };
    for (const scope of [revision1, revision2, news, otherPurpose])
      await sync(scope, actor, [shared]);
    await sync(revision1, actor, []);
    expect(await active(revision1)).toEqual([]);
    expect(await active(revision2)).toEqual([shared]);
    expect(await active(news)).toEqual([shared]);
    expect(await active(otherPurpose)).toEqual([shared]);
    // Removing references never deletes the file.
    await expect(
      fixture.prisma.media.findUnique({ where: { id: shared } }),
    ).resolves.not.toBeNull();
  });

  it('lets the actor attach only own or public READY files', async () => {
    const actor = await user();
    const author = await user();
    const own = await media(actor);
    const ownPending = await media(actor, 'PENDING');
    const authorsPrivate = await media(author);
    const publicFile = await media(author, 'READY', 'PUBLIC');
    const systemPrivate = await media(null);
    const missing = randomUUID();
    const decision = await policy.evaluate(actor, [
      own,
      ownPending,
      authorsPrivate,
      publicFile,
      systemPrivate,
      missing,
      own,
    ]);
    expect(decision.attachable).toEqual([own, publicFile]);
    expect(decision.rejected).toEqual([
      { mediaId: ownPending, reason: 'NOT_READY' },
      { mediaId: authorsPrivate, reason: 'NOT_PERMITTED' },
      { mediaId: systemPrivate, reason: 'NOT_PERMITTED' },
      { mediaId: missing, reason: 'NOT_FOUND' },
    ]);
    await expect(policy.evaluate(actor, [])).resolves.toEqual({
      attachable: [],
      rejected: [],
    });
  });
});
