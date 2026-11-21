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
      const moderator = await tx.user.findUnique({
        where: { id: moderatorId },
        select: { id: true },
      });
      if (!moderator) this.notFound('User');
      await tx.forumModeratorAssignment.create({
        data: { id, categoryId, moderatorId, assignedById: actorId },
      });
      await this.record(
        tx,
        actorId,
        'ForumCategory',
        categoryId,
        'moderator.assigned',
        { assignmentId: id, moderatorId },
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
    return categories
      .filter((category) =>
        canSeeCategory(
          {
            visibility: category.visibility,
            audienceKeys: category.audience.map(({ subjectKey }) => subjectKey),
          },
          viewer,
        ),
      )
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
      where: { categoryId, moderatorId: subjectId, revokedAt: null },
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
