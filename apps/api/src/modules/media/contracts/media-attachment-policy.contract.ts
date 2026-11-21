/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media
 * 📄 File: apps/api/src/modules/media/contracts/media-attachment-policy.contract.ts
 *
 * 🎯 Purpose:
 * Media's decision whether the acting user may attach files to content.
 *
 * ⚠️ Important:
 * The decision is about the real actor of the operation: a file must exist,
 * be READY and be owned by the actor or public. Authorship of the content
 * being edited never grants access to another user's private file. Download
 * visibility (audience, Content Gate) is decided separately at read time.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export type MediaAttachmentRejection = Readonly<{
  mediaId: string;
  reason: 'NOT_FOUND' | 'NOT_READY' | 'NOT_PERMITTED';
}>;

export type MediaAttachmentDecision = Readonly<{
  attachable: readonly string[];
  rejected: readonly MediaAttachmentRejection[];
}>;

export interface MediaAttachmentPolicy {
  evaluate(
    actorId: string,
    mediaIds: readonly string[],
  ): Promise<MediaAttachmentDecision>;
}

export const MEDIA_ATTACHMENT_POLICY = Symbol('MEDIA_ATTACHMENT_POLICY');
