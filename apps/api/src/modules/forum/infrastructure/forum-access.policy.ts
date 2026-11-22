/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Forum (Community Hub)
 * 📄 File: apps/api/src/modules/forum/infrastructure/forum-access.policy.ts
 *
 * 🎯 Purpose:
 * Reads section role matrices and answers "what may this viewer do here?"
 * for one forum, or for every forum at once (lists, search, feeds).
 *
 * ⚠️ Important:
 * Resolution: forum → parent forum → category → platform defaults.
 * Supermoderators and structure managers always get every right. Callers
 * must still apply category visibility and the `active` flags; hidden
 * sections answer 404.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { ForumAccessRule, Prisma } from '@prisma/client';
import {
  effectiveAccess,
  viewerGrant,
  type ForumAccessGrant,
  type ForumAccessMatrix,
  type ForumAccessViewer,
} from '../domain/forum-access.rules';

type ForumRef = { id: string; parentId: string | null; categoryId: string };

export function matrixOf(
  rows: readonly ForumAccessRule[],
): ForumAccessMatrix | null {
  if (rows.length === 0) return null;
  const matrix = {} as ForumAccessMatrix;
  for (const row of rows) {
    matrix[row.role] = {
      view: row.canView,
      read: row.canRead,
      createTopics: row.canCreateTopics,
      reply: row.canReply,
      editOwn: row.canEditOwn,
      deleteOwn: row.canDeleteOwn,
      moderate: row.canModerate,
    };
  }
  return matrix;
}

export class ForumAccessPolicy {
  constructor(
    private readonly prisma: Pick<Prisma.TransactionClient, 'forumAccessRule'>,
  ) {}

  /** Effective matrix of one forum. */
  async matrix(forum: ForumRef): Promise<ForumAccessMatrix> {
    const rules = await this.prisma.forumAccessRule.findMany({
      where: {
        OR: [
          {
            forumId: {
              in: [forum.id, forum.parentId].filter(Boolean) as string[],
            },
          },
          { categoryId: forum.categoryId },
        ],
      },
    });
    return this.resolve(forum, rules);
  }

  async grant(
    viewer: ForumAccessViewer,
    forum: ForumRef,
  ): Promise<ForumAccessGrant> {
    if (viewer.moderatesAllCategories || viewer.seesAllCategories) {
      return viewerGrant(viewer, effectiveAccess([]));
    }
    return viewerGrant(viewer, await this.matrix(forum));
  }

  /** Grants for many forums with a single rules query. */
  async grants(
    viewer: ForumAccessViewer,
    forums: readonly ForumRef[],
  ): Promise<Map<string, ForumAccessGrant>> {
    if (viewer.moderatesAllCategories || viewer.seesAllCategories) {
      const full = viewerGrant(viewer, effectiveAccess([]));
      return new Map(forums.map(({ id }) => [id, full]));
    }
    const rules =
      forums.length === 0 ? [] : await this.prisma.forumAccessRule.findMany();
    return new Map(
      forums.map((forum) => [
        forum.id,
        viewerGrant(viewer, this.resolve(forum, rules)),
      ]),
    );
  }

  private resolve(
    forum: ForumRef,
    rules: readonly ForumAccessRule[],
  ): ForumAccessMatrix {
    const own = rules.filter((rule) => rule.forumId === forum.id);
    const parent = forum.parentId
      ? rules.filter((rule) => rule.forumId === forum.parentId)
      : [];
    const category = rules.filter(
      (rule) => rule.categoryId === forum.categoryId,
    );
    return effectiveAccess([
      matrixOf(own),
      matrixOf(parent),
      matrixOf(category),
    ]);
  }
}
