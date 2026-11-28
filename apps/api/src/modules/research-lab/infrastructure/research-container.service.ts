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
  ) {
    await this.audit.append(tx, {
      action: `research_lab.${kind}_created`,
      actorType: 'USER',
      actorId,
      targetType: kind === 'manual' ? 'ResearchManual' : 'ResearchCollection',
      targetId: id,
      metadata: {},
    });
    await this.outbox.append(
      tx,
      createEventEnvelope({
        name: `research-lab.${kind}.created.v1`,
        version: 1,
        category: 'integration',
        producer: 'dss.api.research-lab',
        actorId,
        aggregate: {
          type: kind === 'manual' ? 'ResearchManual' : 'ResearchCollection',
          id,
        },
        payload: { id },
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
}
