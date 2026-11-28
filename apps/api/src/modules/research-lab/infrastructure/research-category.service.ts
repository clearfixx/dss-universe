import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditWriterService } from '@api/core/audit';
import { PrismaService, type TransactionClient } from '@api/core/database';
import { createEventEnvelope, OutboxWriterService } from '@api/core/events';
import {
  RESEARCH_LAB_AUTHORITY_DECISIONS,
  type ResearchLabAuthorityDecisions,
} from '../contracts/research-lab-authority.contract';
import { ResearchLabCommandError } from '../domain/errors/research-lab-command.error';

type CategoryInput = {
  name: string;
  slug: string;
  parentId?: string | null;
  description?: string | null;
  sortOrder?: number;
};
type UpdateCategoryInput = Partial<CategoryInput> & {
  id: string;
  isActive?: boolean;
};

@Injectable()
export class ResearchCategoryService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(RESEARCH_LAB_AUTHORITY_DECISIONS)
    private readonly authority: ResearchLabAuthorityDecisions,
    private readonly audit: AuditWriterService,
    private readonly outbox: OutboxWriterService,
  ) {}

  private async requireOrganizer(actorId: string) {
    if (!(await this.authority.canOrganize(actorId, new Date()))) {
      throw new ResearchLabCommandError(
        'ACCESS_DENIED',
        'Research Lab organization permission required.',
      );
    }
  }

  private validate(input: Partial<CategoryInput>) {
    if (
      input.name !== undefined &&
      (!input.name.trim() || input.name.length > 120)
    )
      throw new ResearchLabCommandError(
        'INVALID_STATE',
        'Invalid category name.',
      );
    if (
      input.slug !== undefined &&
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug)
    )
      throw new ResearchLabCommandError(
        'INVALID_STATE',
        'Invalid category slug.',
      );
    if (input.slug !== undefined && input.slug.length > 120)
      throw new ResearchLabCommandError(
        'INVALID_STATE',
        'Invalid category slug.',
      );
    if (
      input.sortOrder !== undefined &&
      (!Number.isSafeInteger(input.sortOrder) || input.sortOrder < 0)
    )
      throw new ResearchLabCommandError(
        'INVALID_STATE',
        'Invalid category order.',
      );
  }

  private async lockTree(tx: TransactionClient) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(772321668922213831::bigint)`;
  }

  private async ensureParent(
    tx: TransactionClient,
    id: string | null | undefined,
    childId?: string,
  ) {
    const visited = new Set<string>();
    let current = id;
    while (current) {
      if (current === childId || visited.has(current))
        throw new ResearchLabCommandError(
          'INVALID_STATE',
          'Category hierarchy must be acyclic.',
        );
      visited.add(current);
      const parent = await tx.researchCategory.findUnique({
        where: { id: current },
        select: { parentId: true, isActive: true },
      });
      if (!parent || !parent.isActive)
        throw new ResearchLabCommandError(
          'INVALID_STATE',
          'Active parent category required.',
        );
      current = parent.parentId;
    }
  }

  private async record(
    tx: TransactionClient,
    actorId: string,
    categoryId: string,
    action: 'created' | 'updated',
  ) {
    await this.audit.append(tx, {
      action: `research_lab.category_${action}`,
      actorType: 'USER',
      actorId,
      targetType: 'ResearchCategory',
      targetId: categoryId,
      metadata: {},
    });
    await this.outbox.append(
      tx,
      createEventEnvelope({
        name: `research-lab.category.${action}.v1`,
        version: 1,
        category: 'integration',
        producer: 'dss.api.research-lab',
        actorId,
        aggregate: { type: 'ResearchCategory', id: categoryId },
        payload: { categoryId },
      }),
    );
  }

  private conflict(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    )
      throw new ResearchLabCommandError(
        'REVISION_CONFLICT',
        'Category slug already exists among siblings.',
      );
    throw error;
  }

  async create(actorId: string, input: CategoryInput) {
    await this.requireOrganizer(actorId);
    this.validate(input);
    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.lockTree(tx);
        await this.ensureParent(tx, input.parentId);
        const category = await tx.researchCategory.create({
          data: {
            name: input.name.trim(),
            slug: input.slug,
            parentId: input.parentId ?? null,
            description: input.description?.trim() || null,
            sortOrder: input.sortOrder ?? 0,
          },
        });
        await this.record(tx, actorId, category.id, 'created');
        return category;
      });
    } catch (error) {
      this.conflict(error);
    }
  }

  async update(actorId: string, input: UpdateCategoryInput) {
    await this.requireOrganizer(actorId);
    this.validate(input);
    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.lockTree(tx);
        const existing = await tx.researchCategory.findUnique({
          where: { id: input.id },
          select: { id: true },
        });
        if (!existing)
          throw new ResearchLabCommandError(
            'NOT_FOUND',
            'Research category was not found.',
          );
        if (input.parentId !== undefined)
          await this.ensureParent(tx, input.parentId, input.id);
        const category = await tx.researchCategory.update({
          where: { id: input.id },
          data: {
            ...(input.name !== undefined && { name: input.name.trim() }),
            ...(input.slug !== undefined && { slug: input.slug }),
            ...(input.parentId !== undefined && { parentId: input.parentId }),
            ...(input.description !== undefined && {
              description: input.description?.trim() || null,
            }),
            ...(input.sortOrder !== undefined && {
              sortOrder: input.sortOrder,
            }),
            ...(input.isActive !== undefined && { isActive: input.isActive }),
          },
        });
        await this.record(tx, actorId, category.id, 'updated');
        return category;
      });
    } catch (error) {
      this.conflict(error);
    }
  }
}
