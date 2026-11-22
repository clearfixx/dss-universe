/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Forum (Community Hub)
 * 📄 File: apps/api/src/modules/forum/domain/forum-access.rules.ts
 *
 * 🎯 Purpose:
 * Per-section role matrix (owner decision 2026-11-22, Command Deck mockups
 * "Налаштування Community Hub" and "доступ і видимість форуму"): which
 * forum role may see a section, read its topics, start topics, reply, edit
 * or delete their own posts, and moderate.
 *
 * ⚠️ Important:
 * A subforum without its own matrix inherits its parent forum's, then the
 * category's, then the platform defaults below. The defaults reproduce the
 * behaviour before matrices existed. Guests can never write or moderate;
 * administrators always hold every right (no lock-out). Category
 * visibility still filters reading on top of the matrix.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { ForumCommandError } from './errors/forum-command.error';

export const FORUM_ACCESS_ROLES = [
  'GUEST',
  'MEMBER',
  'CONTRIBUTOR',
  'MODERATOR',
  'ADMIN',
] as const;
export type ForumAccessRole = (typeof FORUM_ACCESS_ROLES)[number];

export const FORUM_ACCESS_ACTIONS = [
  'view',
  'read',
  'createTopics',
  'reply',
  'editOwn',
  'deleteOwn',
  'moderate',
] as const;
export type ForumAccessAction = (typeof FORUM_ACCESS_ACTIONS)[number];

export type ForumAccessGrant = Record<ForumAccessAction, boolean>;
export type ForumAccessMatrix = Record<ForumAccessRole, ForumAccessGrant>;

const all = (value: boolean): ForumAccessGrant => ({
  view: value,
  read: value,
  createTopics: value,
  reply: value,
  editOwn: value,
  deleteOwn: value,
  moderate: value,
});
const writer: ForumAccessGrant = {
  ...all(true),
  deleteOwn: false,
  moderate: false,
};

/** Behaviour before matrices: guests read, members write, admins moderate. */
export const DEFAULT_FORUM_ACCESS: ForumAccessMatrix = {
  GUEST: { ...all(false), view: true, read: true },
  MEMBER: writer,
  CONTRIBUTOR: writer,
  MODERATOR: writer,
  ADMIN: all(true),
};

/** Highest forum role among IAM role names (owner counts as admin). */
export function forumAccessRole(
  subjectId: string | null,
  roles: readonly string[],
): ForumAccessRole {
  if (subjectId === null) return 'GUEST';
  const held = new Set(roles.map((role) => role.toLowerCase()));
  if (held.has('owner') || held.has('admin')) return 'ADMIN';
  if (held.has('moderator')) return 'MODERATOR';
  if (held.has('contributor')) return 'CONTRIBUTOR';
  return 'MEMBER';
}

/**
 * Locks impossible or dangerous combinations: guests never write, edit,
 * delete or moderate; admins keep everything; every action needs `read`,
 * and `read` needs `view`.
 */
export function normalizeAccessGrant(
  role: ForumAccessRole,
  grant: ForumAccessGrant,
): ForumAccessGrant {
  if (role === 'ADMIN') return all(true);
  const view = grant.view;
  const read = view && grant.read;
  const writes = read && role !== 'GUEST';
  return {
    view,
    read,
    createTopics: writes && grant.createTopics,
    reply: writes && grant.reply,
    editOwn: writes && grant.editOwn,
    deleteOwn: writes && grant.deleteOwn,
    moderate: writes && grant.moderate,
  };
}

/** A full matrix: one grant per role, unknown roles rejected. */
export function normalizeAccessMatrix(
  rows: ReadonlyArray<{ role: string } & ForumAccessGrant>,
): ForumAccessMatrix {
  const seen = new Set<string>();
  const matrix = {} as ForumAccessMatrix;
  for (const row of rows) {
    if (!FORUM_ACCESS_ROLES.includes(row.role as ForumAccessRole)) {
      throw new ForumCommandError('INVALID_INPUT', 'Unknown forum role.');
    }
    if (seen.has(row.role)) {
      throw new ForumCommandError(
        'INVALID_INPUT',
        'Each forum role may appear only once.',
      );
    }
    seen.add(row.role);
    const role = row.role as ForumAccessRole;
    matrix[role] = normalizeAccessGrant(role, row);
  }
  for (const role of FORUM_ACCESS_ROLES) {
    if (!matrix[role]) {
      throw new ForumCommandError(
        'INVALID_INPUT',
        'The access matrix must list every forum role.',
      );
    }
  }
  return matrix;
}

/** First defined matrix wins: forum → parent forum → category → defaults. */
export function effectiveAccess(
  chain: ReadonlyArray<ForumAccessMatrix | null | undefined>,
): ForumAccessMatrix {
  return (
    chain.find((matrix): matrix is ForumAccessMatrix => !!matrix) ??
    DEFAULT_FORUM_ACCESS
  );
}

export type ForumAccessViewer = {
  subjectId: string | null;
  accessRole?: ForumAccessRole;
  /** Supermoderators (`forum.moderate.all`): global powers win. */
  moderatesAllCategories: boolean;
  /** Structure managers (`forum.structure.manage`) see and run everything. */
  seesAllCategories: boolean;
};

/** The viewer's rights in a section under its effective matrix. */
export function viewerGrant(
  viewer: ForumAccessViewer,
  matrix: ForumAccessMatrix,
): ForumAccessGrant {
  if (viewer.moderatesAllCategories || viewer.seesAllCategories) {
    return all(true);
  }
  const role =
    viewer.accessRole ?? (viewer.subjectId === null ? 'GUEST' : 'MEMBER');
  return matrix[viewer.subjectId === null ? 'GUEST' : role];
}
