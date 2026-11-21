/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Forum (Community Hub)
 * 📄 File: apps/api/src/modules/forum/domain/forum-moderation.rules.ts
 *
 * 🎯 Purpose:
 * Pure CH-1b moderation rules for posts, topics and staff roles.
 *
 * ⚠️ Important:
 * • authors never delete their own topics or posts;
 * • curators act only on replies inside their own topic;
 * • the first post is removed by trashing the topic, not by post deletion;
 * • PURGED is terminal and reserved for forum.content.purge holders.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { ForumCommandError } from './errors/forum-command.error';
import type { ForumViewerFacts } from './types/forum-structure.type';
import type {
  ForumPostState,
  ForumStaffRole,
  ForumTopicState,
} from './types/forum-topic.type';

export type ForumModerationActor = {
  id: string;
  /** Category assignment or supermoderator scope. */
  moderator: boolean;
  /** Curator of the specific topic. */
  curator: boolean;
};

export function staffRole(
  viewer: ForumViewerFacts,
  actor: ForumModerationActor,
): ForumStaffRole | null {
  if (viewer.seesAllCategories) return 'ADMINISTRATOR';
  if (viewer.moderatesAllCategories) return 'SUPERMODERATOR';
  if (actor.moderator) return 'MODERATOR';
  if (actor.curator) return 'CURATOR';
  return null;
}

export function normalizeModerationReason(value: string): string {
  const reason = value.trim();
  if (reason.length < 3 || reason.length > 1000) {
    throw new ForumCommandError(
      'INVALID_INPUT',
      'Reason must contain 3 to 1000 characters.',
    );
  }
  return reason;
}

export function normalizeStaffNote(value: string): string {
  const body = value.trim();
  if (body.length < 1 || body.length > 2000) {
    throw new ForumCommandError(
      'INVALID_INPUT',
      'A staff note must contain 1 to 2000 characters.',
    );
  }
  return body;
}

export function canModeratePost(
  post: { number: number; state: ForumPostState },
  actor: ForumModerationActor,
  target: 'HIDDEN' | 'DELETED' | 'VISIBLE',
): boolean {
  if (post.number === 1 || post.state === 'PURGED') return false;
  if (!actor.moderator && !actor.curator) return false;
  return target === 'VISIBLE'
    ? post.state === 'HIDDEN' || post.state === 'DELETED'
    : post.state === 'VISIBLE' ||
        (post.state === 'HIDDEN' && target === 'DELETED');
}

export const TOPIC_MODERATION_TRANSITIONS: Readonly<
  Record<
    'ARCHIVE' | 'UNARCHIVE' | 'TRASH' | 'RESTORE',
    readonly ForumTopicState[]
  >
> = {
  ARCHIVE: ['OPEN', 'CLOSED'],
  UNARCHIVE: ['ARCHIVED'],
  TRASH: ['OPEN', 'CLOSED', 'ARCHIVED'],
  RESTORE: ['TRASHED'],
};

/** 🧹 Moderation should leave a trail, never a hole. */
