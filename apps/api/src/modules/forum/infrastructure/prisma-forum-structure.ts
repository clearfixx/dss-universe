/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Forum (Community Hub)
 * 📄 File: apps/api/src/modules/forum/infrastructure/prisma-forum-structure.ts
 *
 * 🎯 Purpose:
 * Implements CH-0: categories, forums, one level of subforums, category
 * visibility and category moderator assignments.
 *
 * ⚠️ Important:
 * Hierarchy rules are checked here and backstopped by a database trigger.
 * Every structure change appends audit and Outbox evidence in one transaction.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { Prisma, type Forum as ForumRow } from '@prisma/client';
import { AuditWriterService } from '@api/core/audit';
import { PrismaService, type TransactionClient } from '@api/core/database';
import { createEventEnvelope, OutboxWriterService } from '@api/core/events';
import {
  FORUM_VIEWER_FACTS,
  type ForumViewerFactsReader,
} from '../contracts/forum-viewer-facts.contract';
import { ForumCommandError } from '../domain/errors/forum-command.error';
import { ForumAccessPolicy, matrixOf } from './forum-access.policy';
import {
  effectiveAccess,
  FORUM_ACCESS_ACTIONS,
  FORUM_ACCESS_ROLES,
  normalizeAccessMatrix,
  type ForumAccessGrant,
  type ForumAccessMatrix,
} from '../domain/forum-access.rules';
import {
  canSeeCategory,
  normalizeCategoryInput,
  normalizeForumInput,
} from '../domain/forum-structure.rules';
import type {
  ForumCategoryInput,
  ForumCategoryNode,
  ForumInput,
  ForumModeratorAssignmentRecord,
  ForumNode,
  ForumViewerFacts,
} from '../domain/types/forum-structure.type';

const PRODUCER = 'dss.api.forum';

@Injectable()
export class ForumStructureService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditWriterService,
    private readonly outbox: OutboxWriterService,
    @Inject(FORUM_VIEWER_FACTS)
    private readonly viewers: ForumViewerFactsReader,
  ) {}

  async createCategory(
    actorId: string,
    input: ForumCategoryInput,
  ): Promise<ForumCategoryNode> {
    await this.requireStructureManager(actorId);
    const data = normalizeCategoryInput(input);
    const id = randomUUID();
    await this.write(async (tx) => {
      await tx.forumCategory.create({
        data: {
          id,
          slug: data.slug,
          title: data.title,
          description: data.description,
          position: data.position,
          visibility: data.visibility,
          active: data.active,
          audience: {
            create: data.audienceKeys.map((subjectKey) => ({ subjectKey })),
          },
        },
      });
      await this.record(tx, actorId, 'ForumCategory', id, 'category.created', {
        slug: data.slug,
        visibility: data.visibility,
        audienceKeys: data.audienceKeys,
      });
    });
    return this.categoryForManager(id);
  }

  async updateCategory(
    actorId: string,
    categoryId: string,
    input: ForumCategoryInput,
  ): Promise<ForumCategoryNode> {
    await this.requireStructureManager(actorId);
    const data = normalizeCategoryInput(input);
    await this.write(async (tx) => {
      const updated = await tx.forumCategory.updateMany({
        where: { id: categoryId },
        data: {
          slug: data.slug,
          title: data.title,
          description: data.description,
          position: data.position,
          visibility: data.visibility,
          active: data.active,
        },
      });
      if (updated.count !== 1) this.notFound('Forum category');
      await tx.forumCategoryAudience.deleteMany({ where: { categoryId } });
      if (data.audienceKeys.length > 0) {
        await tx.forumCategoryAudience.createMany({
          data: data.audienceKeys.map((subjectKey) => ({
            categoryId,
            subjectKey,
          })),
        });
      }
      await this.record(
        tx,
        actorId,
        'ForumCategory',
        categoryId,
        'category.updated',
        {
          slug: data.slug,
          visibility: data.visibility,
          audienceKeys: data.audienceKeys,
          active: data.active,
        },
      );
    });
    return this.categoryForManager(categoryId);
  }

  async createForum(actorId: string, input: ForumInput): Promise<ForumNode> {
    await this.requireStructureManager(actorId);
    const data = normalizeForumInput(input);
    const id = randomUUID();
    await this.write(async (tx) => {
      await this.assertPlacement(tx, null, data);
      await tx.forum.create({ data: { id, ...data } });
      await this.record(tx, actorId, 'Forum', id, 'forum.created', {
        categoryId: data.categoryId,
        parentId: data.parentId,
        slug: data.slug,
      });
    });
    return this.forumNode(id);
  }

  async updateForum(
    actorId: string,
    forumId: string,
    input: ForumInput,
  ): Promise<ForumNode> {
    await this.requireStructureManager(actorId);
    const data = normalizeForumInput(input);
    await this.write(async (tx) => {
      const current = await tx.forum.findUnique({
        where: { id: forumId },
        select: { id: true },
      });
      if (!current) this.notFound('Forum');
      await this.assertPlacement(tx, forumId, data);
      await tx.forum.update({ where: { id: forumId }, data });
      await this.record(tx, actorId, 'Forum', forumId, 'forum.updated', {
        categoryId: data.categoryId,
        parentId: data.parentId,
        slug: data.slug,
        active: data.active,
      });
    });
    return this.forumNode(forumId);
  }

  async assignModerator(
    actorId: string,
    categoryId: string,
    moderatorId: string,
    forumId: string | null = null,
  ): Promise<ForumModeratorAssignmentRecord> {
    const actor = await this.viewers.read(actorId, new Date());
    if (!actor.canAssignModerators) this.denied();
    const id = randomUUID();
    await this.write(async (tx) => {
      const category = await tx.forumCategory.findUnique({
        where: { id: categoryId },
        select: { id: true },
      });
      if (!category) this.notFound('Forum category');
      if (forumId) {
        const forum = await tx.forum.findUnique({
          where: { id: forumId },
          select: { categoryId: true },
        });
        if (!forum || forum.categoryId !== categoryId) this.notFound('Forum');
      }
      const moderator = await tx.user.findUnique({
        where: { id: moderatorId },
        select: { id: true },
      });
      if (!moderator) this.notFound('User');
      await tx.forumModeratorAssignment.create({
        data: { id, categoryId, forumId, moderatorId, assignedById: actorId },
      });
      await this.record(
        tx,
        actorId,
        'ForumCategory',
        categoryId,
        'moderator.assigned',
        { assignmentId: id, moderatorId, forumId },
      );
    });
    return this.assignment(id);
  }

  async revokeModerator(
    actorId: string,
    assignmentId: string,
  ): Promise<ForumModeratorAssignmentRecord> {
    const actor = await this.viewers.read(actorId, new Date());
    if (!actor.canAssignModerators) this.denied();
    await this.write(async (tx) => {
      const revoked = await tx.forumModeratorAssignment.updateManyAndReturn({
        where: { id: assignmentId, revokedAt: null },
        data: { revokedAt: new Date(), revokedById: actorId },
      });
      if (revoked.length !== 1) this.notFound('Active moderator assignment');
      await this.record(
        tx,
        actorId,
        'ForumCategory',
        revoked[0].categoryId,
        'moderator.revoked',
        { assignmentId, moderatorId: revoked[0].moderatorId },
      );
    });
    return this.assignment(assignmentId);
  }

  async visibleTree(viewerId: string | null): Promise<ForumCategoryNode[]> {
    const viewer = await this.viewers.read(viewerId, new Date());
    const categories = await this.prisma.forumCategory.findMany({
      where: viewer.seesAllCategories ? {} : { active: true },
      include: {
        audience: { select: { subjectKey: true } },
        forums: {
          where: viewer.seesAllCategories ? {} : { active: true },
          orderBy: [{ position: 'asc' }, { id: 'asc' }],
        },
      },
      orderBy: [{ position: 'asc' }, { id: 'asc' }],
    });
    const visibleCategories = categories.filter((category) =>
      canSeeCategory(
        {
          visibility: category.visibility,
          audienceKeys: category.audience.map(({ subjectKey }) => subjectKey),
        },
        viewer,
      ),
    );
    // Section matrices hide what a role may not see; unlisted sections stay
    // out of lists for everyone but staff (they still open by link).
    const grants = await new ForumAccessPolicy(this.prisma).grants(
      viewer,
      visibleCategories.flatMap(({ forums }) => forums),
    );
    return visibleCategories
      .map((category) => ({
        ...category,
        forums: category.forums.filter((forum) => {
          const grant = grants.get(forum.id);
          return (
            grant?.view === true &&
            (forum.listed || viewer.seesAllCategories || grant.moderate)
          );
        }),
      }))
      .map((category) => ({
        id: category.id,
        slug: category.slug,
        title: category.title,
        description: category.description,
        position: category.position,
        active: category.active,
        visibility: category.visibility,
        audienceKeys: viewer.seesAllCategories
          ? category.audience.map(({ subjectKey }) => subjectKey).sort()
          : null,
        forums: this.tree(category.forums),
      }));
  }

  async moderators(
    viewerId: string | null,
    categoryId: string,
  ): Promise<ForumModeratorAssignmentRecord[]> {
    await this.requireVisibleCategory(viewerId, categoryId);
    const rows = await this.prisma.forumModeratorAssignment.findMany({
      where: { categoryId, revokedAt: null },
      orderBy: [{ assignedAt: 'asc' }, { id: 'asc' }],
    });
    return rows;
  }

  /** Category moderation scope for later Forum packages (CH-1/CH-4). */
  async canModerateCategory(
    subjectId: string,
    categoryId: string,
  ): Promise<boolean> {
    const viewer = await this.viewers.read(subjectId, new Date());
    if (viewer.subjectId === null) return false;
    if (viewer.moderatesAllCategories) return true;
    const assignment = await this.prisma.forumModeratorAssignment.findFirst({
      where: {
        categoryId,
        forumId: null,
        moderatorId: subjectId,
        revokedAt: null,
      },
      select: { id: true },
    });
    return assignment !== null;
  }

  /** Forum-level assignment on the forum or its parent forum. */
  async canModerateForum(
    subjectId: string,
    forumIds: readonly string[],
  ): Promise<boolean> {
    if (forumIds.length === 0) return false;
    const assignment = await this.prisma.forumModeratorAssignment.findFirst({
      where: {
        forumId: { in: [...forumIds] },
        moderatorId: subjectId,
        revokedAt: null,
      },
      select: { id: true },
    });
    return assignment !== null;
  }

  private async requireVisibleCategory(
    viewerId: string | null,
    categoryId: string,
  ): Promise<ForumViewerFacts> {
    const viewer = await this.viewers.read(viewerId, new Date());
    const category = await this.prisma.forumCategory.findUnique({
      where: { id: categoryId },
      include: { audience: { select: { subjectKey: true } } },
    });
    if (
      !category ||
      (!category.active && !viewer.seesAllCategories) ||
      !canSeeCategory(
        {
          visibility: category.visibility,
          audienceKeys: category.audience.map(({ subjectKey }) => subjectKey),
        },
        viewer,
      )
    ) {
      // Hidden categories are indistinguishable from missing ones.
      this.notFound('Forum category');
    }
    return viewer;
  }

  /**
   * Command Deck "Зберегти зміни": updates any number of categories and
   * forums (fields, order, switches and role matrices) in ONE transaction,
   * each change audited. `access: null` drops a section's own matrix so it
   * inherits again; an omitted `access` leaves it untouched.
   */
  async saveSettings(
    actorId: string,
    input: {
      categories: ReadonlyArray<{
        id: string;
        input: ForumCategoryInput;
        access?: ReadonlyArray<{ role: string } & ForumAccessGrant> | null;
      }>;
      forums: ReadonlyArray<{
        id: string;
        input: ForumInput;
        access?: ReadonlyArray<{ role: string } & ForumAccessGrant> | null;
      }>;
    },
  ): Promise<ForumCategoryNode[]> {
    await this.requireStructureManager(actorId);
    if (input.categories.length + input.forums.length > 200) {
      this.invalid('Save at most 200 sections at once.');
    }
    const categories = input.categories.map((change) => ({
      ...change,
      data: normalizeCategoryInput(change.input),
      matrix: this.matrixInput(change.access),
    }));
    const forums = input.forums.map((change) => ({
      ...change,
      data: normalizeForumInput(change.input),
      matrix: this.matrixInput(change.access),
    }));
    await this.write(async (tx) => {
      for (const change of categories) {
        const { data } = change;
        const updated = await tx.forumCategory.updateMany({
          where: { id: change.id },
          data: {
            slug: data.slug,
            title: data.title,
            description: data.description,
            position: data.position,
            visibility: data.visibility,
            active: data.active,
          },
        });
        if (updated.count !== 1) this.notFound('Forum category');
        await tx.forumCategoryAudience.deleteMany({
          where: { categoryId: change.id },
        });
        if (data.audienceKeys.length > 0) {
          await tx.forumCategoryAudience.createMany({
            data: data.audienceKeys.map((subjectKey) => ({
              categoryId: change.id,
              subjectKey,
            })),
          });
        }
        await this.writeMatrix(
          tx,
          actorId,
          { categoryId: change.id },
          change.matrix,
        );
        await this.record(
          tx,
          actorId,
          'ForumCategory',
          change.id,
          'category.updated',
          {
            slug: data.slug,
            visibility: data.visibility,
            audienceKeys: data.audienceKeys,
            active: data.active,
            access: this.matrixAudit(change.matrix),
          },
        );
      }
      for (const change of forums) {
        const { data } = change;
        const current = await tx.forum.findUnique({
          where: { id: change.id },
          select: { id: true },
        });
        if (!current) this.notFound('Forum');
        await this.assertPlacement(tx, change.id, data);
        await tx.forum.update({ where: { id: change.id }, data });
        await this.writeMatrix(
          tx,
          actorId,
          { forumId: change.id },
          change.matrix,
        );
        await this.record(tx, actorId, 'Forum', change.id, 'forum.updated', {
          categoryId: data.categoryId,
          parentId: data.parentId,
          slug: data.slug,
          active: data.active,
          listed: data.listed ?? null,
          access: this.matrixAudit(change.matrix),
        });
      }
    });
    return this.visibleTree(actorId);
  }

  /** A section's own matrix (null when it inherits) and the one in force. */
  async sectionAccess(
    actorId: string,
    scope: { categoryId?: string | null; forumId?: string | null },
  ): Promise<{
    source: 'FORUM' | 'PARENT' | 'CATEGORY' | 'DEFAULT';
    own: ForumAccessMatrix | null;
    effective: ForumAccessMatrix;
  }> {
    await this.requireStructureManager(actorId);
    if (!scope.categoryId === !scope.forumId) {
      this.invalid('Pass exactly one of categoryId or forumId.');
    }
    if (scope.categoryId) {
      const category = await this.prisma.forumCategory.findUnique({
        where: { id: scope.categoryId },
        select: { id: true },
      });
      if (!category) this.notFound('Forum category');
      const own = matrixOf(
        await this.prisma.forumAccessRule.findMany({
          where: { categoryId: scope.categoryId },
        }),
      );
      return {
        source: own ? 'CATEGORY' : 'DEFAULT',
        own,
        effective: effectiveAccess([own]),
      };
    }
    const forum = await this.prisma.forum.findUnique({
      where: { id: scope.forumId! },
      select: { id: true, parentId: true, categoryId: true },
    });
    if (!forum) this.notFound('Forum');
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
    const own = matrixOf(rules.filter((rule) => rule.forumId === forum.id));
    const parent = forum.parentId
      ? matrixOf(rules.filter((rule) => rule.forumId === forum.parentId))
      : null;
    const category = matrixOf(
      rules.filter((rule) => rule.categoryId === forum.categoryId),
    );
    return {
      source: own
        ? 'FORUM'
        : parent
          ? 'PARENT'
          : category
            ? 'CATEGORY'
            : 'DEFAULT',
      own,
      effective: effectiveAccess([own, parent, category]),
    };
  }

  private matrixInput(
    access:
      | ReadonlyArray<{ role: string } & ForumAccessGrant>
      | null
      | undefined,
  ): ForumAccessMatrix | null | undefined {
    if (access === undefined) return undefined;
    if (access === null) return null;
    return normalizeAccessMatrix(access);
  }

  private matrixAudit(
    matrix: ForumAccessMatrix | null | undefined,
  ): string | null {
    if (matrix === undefined) return null;
    if (matrix === null) return 'inherit';
    return FORUM_ACCESS_ROLES.map(
      (role) =>
        role +
        ':' +
        FORUM_ACCESS_ACTIONS.filter((action) => matrix[role][action]).join('+'),
    ).join(' ');
  }

  private async writeMatrix(
    tx: TransactionClient,
    actorId: string,
    scope: { categoryId: string } | { forumId: string },
    matrix: ForumAccessMatrix | null | undefined,
  ): Promise<void> {
    if (matrix === undefined) return;
    await tx.forumAccessRule.deleteMany({ where: scope });
    if (matrix === null) return;
    await tx.forumAccessRule.createMany({
      data: FORUM_ACCESS_ROLES.map((role) => ({
        ...scope,
        role,
        canView: matrix[role].view,
        canRead: matrix[role].read,
        canCreateTopics: matrix[role].createTopics,
        canReply: matrix[role].reply,
        canEditOwn: matrix[role].editOwn,
        canDeleteOwn: matrix[role].deleteOwn,
        canModerate: matrix[role].moderate,
        updatedById: actorId,
      })),
    });
  }

  private invalid(message: string): never {
    throw new ForumCommandError('INVALID_INPUT', message);
  }

  private async assertPlacement(
    tx: TransactionClient,
    forumId: string | null,
    data: ForumInput,
  ): Promise<void> {
    const category = await tx.forumCategory.findUnique({
      where: { id: data.categoryId },
      select: { id: true },
    });
    if (!category) this.notFound('Forum category');
    if (forumId) {
      const children = await tx.forum.count({ where: { parentId: forumId } });
      if (children > 0 && data.parentId !== null) {
        throw new ForumCommandError(
          'INVALID_INPUT',
          'A forum with subforums cannot become a subforum.',
        );
      }
      if (children > 0) {
        const current = await tx.forum.findUniqueOrThrow({
          where: { id: forumId },
          select: { categoryId: true },
        });
        if (current.categoryId !== data.categoryId) {
          throw new ForumCommandError(
            'INVALID_INPUT',
            'Move subforums together with their parent.',
          );
        }
      }
    }
    if (data.parentId === null) return;
    if (data.parentId === forumId) {
      throw new ForumCommandError(
        'INVALID_INPUT',
        'A forum cannot be its own parent.',
      );
    }
    const parent = await tx.forum.findUnique({
      where: { id: data.parentId },
      select: { categoryId: true, parentId: true },
    });
    if (!parent) this.notFound('Parent forum');
    if (parent.categoryId !== data.categoryId) {
      throw new ForumCommandError(
        'INVALID_INPUT',
        "A subforum must belong to its parent's category.",
      );
    }
    if (parent.parentId !== null) {
      throw new ForumCommandError(
        'INVALID_INPUT',
        'Subforums support one level of nesting only.',
      );
    }
  }

  private tree(rows: ForumRow[]): ForumNode[] {
    const nodes = new Map<string, ForumNode>(
      rows.map((row) => [row.id, { ...this.toNode(row), subforums: [] }]),
    );
    const roots: ForumNode[] = [];
    for (const row of rows) {
      const node = nodes.get(row.id)!;
      const parent = row.parentId ? nodes.get(row.parentId) : undefined;
      if (row.parentId === null) roots.push(node);
      else if (parent) parent.subforums.push(node);
      // A subforum whose parent is hidden (inactive) stays hidden too.
    }
    return roots;
  }

  private toNode(row: ForumRow): Omit<ForumNode, 'subforums'> {
    return {
      id: row.id,
      categoryId: row.categoryId,
      parentId: row.parentId,
      slug: row.slug,
      title: row.title,
      description: row.description,
      position: row.position,
      active: row.active,
      allowsGatedContent: row.allowsGatedContent,
      allowTopics: row.allowTopics,
      allowReplies: row.allowReplies,
      allowPolls: row.allowPolls,
      allowAttachments: row.allowAttachments,
      listed: row.listed,
      searchable: row.searchable,
      showCounts: row.showCounts,
      pinnedLimit: row.pinnedLimit,
    };
  }

  private async forumNode(id: string): Promise<ForumNode> {
    const row = await this.prisma.forum.findUniqueOrThrow({ where: { id } });
    const children = await this.prisma.forum.findMany({
      where: { parentId: id },
      orderBy: [{ position: 'asc' }, { id: 'asc' }],
    });
    return {
      ...this.toNode(row),
      subforums: children.map((child) => ({
        ...this.toNode(child),
        subforums: [],
      })),
    };
  }

  private async categoryForManager(id: string): Promise<ForumCategoryNode> {
    const category = await this.prisma.forumCategory.findUniqueOrThrow({
      where: { id },
      include: {
        audience: { select: { subjectKey: true } },
        forums: { orderBy: [{ position: 'asc' }, { id: 'asc' }] },
      },
    });
    return {
      id: category.id,
      slug: category.slug,
      title: category.title,
      description: category.description,
      position: category.position,
      active: category.active,
      visibility: category.visibility,
      audienceKeys: category.audience
        .map(({ subjectKey }) => subjectKey)
        .sort(),
      forums: this.tree(category.forums),
    };
  }

  private assignment(id: string): Promise<ForumModeratorAssignmentRecord> {
    return this.prisma.forumModeratorAssignment.findUniqueOrThrow({
      where: { id },
    });
  }

  private async requireStructureManager(actorId: string): Promise<void> {
    const actor = await this.viewers.read(actorId, new Date());
    if (!actor.seesAllCategories) this.denied();
  }

  private async write(
    operation: (tx: TransactionClient) => Promise<void>,
  ): Promise<void> {
    try {
      await this.prisma.$transaction(operation);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ForumCommandError(
          'CONFLICT',
          'The slug or moderator assignment already exists.',
        );
      }
      throw error;
    }
  }

  private async record(
    tx: TransactionClient,
    actorId: string,
    targetType: 'ForumCategory' | 'Forum',
    targetId: string,
    action: string,
    metadata: Record<string, string | boolean | null | string[]>,
  ): Promise<void> {
    await this.audit.append(tx, {
      action: 'forum.' + action.replaceAll('.', '_'),
      actorType: 'USER',
      actorId,
      targetType,
      targetId,
      metadata,
    });
    await this.outbox.append(
      tx,
      createEventEnvelope({
        name: 'forum.' + action + '.v1',
        version: 1,
        category: 'integration',
        producer: PRODUCER,
        actorId,
        aggregate: { type: targetType, id: targetId },
        payload: { targetId, ...metadata },
      }),
    );
  }

  private denied(): never {
    throw new ForumCommandError('ACCESS_DENIED', 'Insufficient permissions.');
  }

  private notFound(target: string): never {
    throw new ForumCommandError('NOT_FOUND', target + ' was not found.');
  }
}
