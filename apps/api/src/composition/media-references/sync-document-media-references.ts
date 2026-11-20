/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media Reference Composition
 * 📄 File: apps/api/src/composition/media-references/sync-document-media-references.ts
 *
 * 🎯 Purpose:
 * Makes the active Media references of one owner scope equal an exact set,
 * inside the owner's own transaction.
 *
 * 🧠 Responsibilities:
 * • scope = (targetType, targetId, purpose); nothing outside it is touched,
 *   so the same file stays referenced by other revisions or modules;
 * • an empty set removes every active reference of the scope;
 * • repeating the same set is a no-op; a previously removed reference is
 *   restored instead of duplicated.
 *
 * ⚠️ Important:
 * The owner decides when and with which set to call this (draft save,
 * submission, publication, revocation, purge). Removing a reference never
 * deletes a file: physical cleanup belongs to Media. Callers must have
 * collected IDs from a validated document and checked
 * `MEDIA_ATTACHMENT_POLICY` for the acting user beforehand.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { TransactionClient } from '@api/core/database';

export type DocumentMediaReferenceScope = Readonly<{
  targetType: string;
  targetId: string;
  purpose: string;
}>;

export async function syncDocumentMediaReferences(
  transaction: TransactionClient,
  scope: DocumentMediaReferenceScope,
  actorId: string,
  mediaIds: readonly string[],
): Promise<void> {
  const wanted = [...new Set(mediaIds)];
  await transaction.mediaReference.updateMany({
    where: {
      ...scope,
      removedAt: null,
      ...(wanted.length ? { mediaId: { notIn: wanted } } : {}),
    },
    data: { removedAt: new Date() },
  });
  for (const mediaId of wanted) {
    const existing = await transaction.mediaReference.findFirst({
      where: { ...scope, mediaId },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) {
      if (existing.removedAt) {
        await transaction.mediaReference.update({
          where: { id: existing.id },
          data: { removedAt: null, createdBy: actorId },
        });
      }
    } else {
      await transaction.mediaReference.create({
        data: { ...scope, mediaId, createdBy: actorId },
      });
    }
  }
}
