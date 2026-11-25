/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Forum (Community Hub)
 * 📄 File: apps/api/src/modules/forum/infrastructure/forum-post-media.port.ts
 *
 * 🎯 Purpose:
 * Forum's consumer-owned port for Media in posts (CH-3c), bound in root
 * composition to the shared document Media reference pieces.
 *
 * ⚠️ Important:
 * Technical port for Forum's own write transactions; it never exposes Media
 * persistence. Attach permission is evaluated for the acting user and only
 * for files the post does not already reference, so a moderator editing a
 * post never needs access to the author's private files.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { TransactionClient } from '@api/core/database';

export type ForumPostMediaRejection = Readonly<{
  mediaId: string;
  reason: 'NOT_FOUND' | 'NOT_READY' | 'NOT_PERMITTED';
}>;

export type ForumPostAttachment = Readonly<{
  mediaId: string;
  filename: string;
  mimeType: string;
  size: number;
  downloadUrl: string;
}>;

export interface ForumPostMedia {
  /** Media IDs the post currently references (active references). */
  activeMediaIds(postId: string): Promise<string[]>;
  /** Files the actor may not attach; empty when all are attachable. */
  rejectedForActor(
    actorId: string,
    mediaIds: readonly string[],
  ): Promise<readonly ForumPostMediaRejection[]>;
  /** Extension and size of files the actor may attach (section limits). */
  files?(
    actorId: string,
    mediaIds: readonly string[],
  ): Promise<
    ReadonlyArray<{ mediaId: string; extension: string; size: number }>
  >;
  /** Makes the post's active references exactly `mediaIds`. */
  sync(
    transaction: TransactionClient,
    postId: string,
    actorId: string,
    mediaIds: readonly string[],
  ): Promise<void>;
  /** Deliverable (public, READY, still referenced) files for a viewer-safe ID list. */
  attachments(
    postId: string,
    mediaIds: readonly string[],
  ): Promise<readonly ForumPostAttachment[]>;
}

export const FORUM_POST_MEDIA = Symbol('FORUM_POST_MEDIA');
export const FORUM_POST_MEDIA_PURPOSE = 'forum.post.media';
