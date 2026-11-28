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

export type ResearchContainerInput = {
  language: string;
  slug: string;
  title: string;
  description?: string | null;
  pageIds: string[];
};
export type ResearchReorderContainerInput = {
  id: string;
  expectedPageIds: string[];
  pageIds: string[];
};

@Injectable()
export class ResearchContainerService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(RESEARCH_LAB_AUTHORITY_DECISIONS)
    private readonly authority: ResearchLabAuthorityDecisions,
    private readonly audit: AuditWriterService,
    private readonly outbox: OutboxWriterService,
  ) {}

  private async requireOrganizer(actorId: string) {
    if (!(await this.authority.canOrganize(actorId, new Date())))
      throw new ResearchLabCommandError(
        'ACCESS_DENIED',
        'Research Lab organization permission required.',
      );
  }

  private validate(input: ResearchContainerInput) {
    if (!/^[a-z]{2}(?:-[A-Z]{2})?$/.test(input.language))
      throw new ResearchLabCommandError('INVALID_STATE', 'Invalid language.');
    if (
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug) ||
      input.slug.length > 120
    )
      throw new ResearchLabCommandError(
        'INVALID_STATE',
        'Invalid container slug.',
      );
    if (!input.title.trim() || input.title.length > 200)
      throw new ResearchLabCommandError(
        'INVALID_STATE',
        'Invalid container title.',
      );
    if (
      input.pageIds.length > 200 ||
      new Set(input.pageIds).size !== input.pageIds.length
    )
      throw new ResearchLabCommandError(
        'INVALID_STATE',
        'Duplicate or excessive pages.',
      );
  }

  private async validatePages(
    tx: TransactionClient,
    input: ResearchContainerInput,
  ) {
    if (input.pageIds.length === 0) return;
    const pages = await tx.researchPage.findMany({
      where: {
        id: { in: input.pageIds },
        language: input.language,
        state: { not: 'TOMBSTONED' },
      },
      select: { id: true },
    });
    if (pages.length !== input.pageIds.length)
      throw new ResearchLabCommandError(
        'INVALID_STATE',
        'Container pages must exist in the same language.',
      );
  }

  private async record(
    tx: TransactionClient,
    actorId: string,
    kind: 'manual' | 'collection',
    id: string,
    action: 'created' | 'reordered' = 'created',
    metadata: Record<string, string[]> = {},
  ) {
    await this.audit.append(tx, {
      action: `research_lab.${kind}_${action}`,
      actorType: 'USER',
      actorId,
      targetType: kind === 'manual' ? 'ResearchManual' : 'ResearchCollection',
      targetId: id,
      metadata,
    });
    await this.outbox.append(
      tx,
      createEventEnvelope({
        name: `research-lab.${kind}.${action}.v1`,
        version: 1,
        category: 'integration',
        producer: 'dss.api.research-lab',
        actorId,
        aggregate: {
          type: kind === 'manual' ? 'ResearchManual' : 'ResearchCollection',
          id,
        },
        payload: { id, ...metadata },
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
        'Container route already exists.',
      );
    throw error;
  }

  async createManual(actorId: string, input: ResearchContainerInput) {
    await this.requireOrganizer(actorId);
    this.validate(input);
    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.validatePages(tx, input);
        const manual = await tx.researchManual.create({
          data: {
            language: input.language,
            slug: input.slug,
            title: input.title.trim(),
            description: input.description?.trim() || null,
            chapters: {
              create: input.pageIds.map((pageId, position) => ({
                pageId,
                position,
              })),
            },
          },
        });
        await this.record(tx, actorId, 'manual', manual.id);
        return manual;
      });
    } catch (error) {
      this.conflict(error);
    }
  }

  async createCollection(actorId: string, input: ResearchContainerInput) {
    await this.requireOrganizer(actorId);
    this.validate(input);
    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.validatePages(tx, input);
        const collection = await tx.researchCollection.create({
          data: {
            language: input.language,
            slug: input.slug,
            title: input.title.trim(),
            description: input.description?.trim() || null,
            items: {
              create: input.pageIds.map((pageId, position) => ({
                pageId,
                position,
              })),
            },
          },
        });
        await this.record(tx, actorId, 'collection', collection.id);
        return collection;
      });
    } catch (error) {
      this.conflict(error);
    }
  }

  private assertExpected(
    input: ResearchReorderContainerInput,
    current: string[],
  ) {
    if (
      input.pageIds.length > 200 ||
      new Set(input.pageIds).size !== input.pageIds.length
    )
      throw new ResearchLabCommandError(
        'INVALID_STATE',
        'Duplicate or excessive pages.',
      );
    if (
      input.expectedPageIds.length !== current.length ||
      input.expectedPageIds.some((id, index) => id !== current[index])
    )
      throw new ResearchLabCommandError(
        'REVISION_CONFLICT',
        'Container order changed since it was read.',
      );
  }

  private async lockContainer(tx: TransactionClient, kind: string, id: string) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`research-lab:${kind}:${id}`}, 0))`;
  }

  async reorderManual(actorId: string, input: ResearchReorderContainerInput) {
    await this.requireOrganizer(actorId);
    return this.prisma.$transaction(async (tx) => {
      await this.lockContainer(tx, 'manual', input.id);
      const manual = await tx.researchManual.findUnique({
        where: { id: input.id },
        select: {
          id: true,
          language: true,
          slug: true,
          chapters: { orderBy: { position: 'asc' }, select: { pageId: true } },
        },
      });
      if (!manual)
        throw new ResearchLabCommandError(
          'NOT_FOUND',
          'Research manual was not found.',
        );
      const previous = manual.chapters.map((row) => row.pageId);
      this.assertExpected(input, previous);
      await this.validatePages(tx, {
        language: manual.language,
        slug: manual.slug,
        title: 'manual',
        pageIds: input.pageIds,
      });
      await tx.researchManualChapter.deleteMany({
        where: { manualId: manual.id },
      });
      if (input.pageIds.length)
        await tx.researchManualChapter.createMany({
          data: input.pageIds.map((pageId, position) => ({
            manualId: manual.id,
            pageId,
            position,
          })),
        });
      await this.record(tx, actorId, 'manual', manual.id, 'reordered', {
        previousPageIds: previous,
        pageIds: input.pageIds,
      });
      return { id: manual.id, language: manual.language, slug: manual.slug };
    });
  }

  async reorderCollection(
    actorId: string,
    input: ResearchReorderContainerInput,
  ) {
    await this.requireOrganizer(actorId);
    return this.prisma.$transaction(async (tx) => {
      await this.lockContainer(tx, 'collection', input.id);
      const collection = await tx.researchCollection.findUnique({
        where: { id: input.id },
        select: {
          id: true,
          language: true,
          slug: true,
          items: { orderBy: { position: 'asc' }, select: { pageId: true } },
        },
      });
      if (!collection)
        throw new ResearchLabCommandError(
          'NOT_FOUND',
          'Research collection was not found.',
        );
      const previous = collection.items.map((row) => row.pageId);
      this.assertExpected(input, previous);
      await this.validatePages(tx, {
        language: collection.language,
        slug: collection.slug,
        title: 'collection',
        pageIds: input.pageIds,
      });
      await tx.researchCollectionItem.deleteMany({
        where: { collectionId: collection.id },
      });
      if (input.pageIds.length)
        await tx.researchCollectionItem.createMany({
          data: input.pageIds.map((pageId, position) => ({
            collectionId: collection.id,
            pageId,
            position,
          })),
        });
      await this.record(tx, actorId, 'collection', collection.id, 'reordered', {
        previousPageIds: previous,
        pageIds: input.pageIds,
      });
      return {
        id: collection.id,
        language: collection.language,
        slug: collection.slug,
      };
    });
  }
}
