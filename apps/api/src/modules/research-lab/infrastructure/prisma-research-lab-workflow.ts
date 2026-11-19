/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Research Lab
 * 📄 File: apps/api/src/modules/research-lab/infrastructure/prisma-research-lab-workflow.ts
 *
 * 🎯 Purpose:
 * Implements RL-1 private drafts, immutable review submissions and Guardian decisions.
 *
 * ⚠️ Important:
 * Draft writes use compare-and-swap. Review decisions serialize per page and re-read state.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { createHash, randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { Prisma, type ResearchRevision } from '@prisma/client';
import { AuditWriterService } from '@api/core/audit';
import { PrismaService, type TransactionClient } from '@api/core/database';
import { createEventEnvelope, OutboxWriterService } from '@api/core/events';
import {
  EDITOR_DOCUMENT_NORMALIZER,
  type EditorDocumentNormalizer,
  type ValidatedEditorDocument,
} from '@api/modules/editor';
import {
  RESEARCH_LAB_AUTHORITY_DECISIONS,
  type ResearchLabAuthorityDecisions,
} from '../contracts/research-lab-authority.contract';
import { ResearchLabCommandError } from '../domain/errors/research-lab-command.error';
import { assertResearchRevisionTransition } from '../domain/research-lab.lifecycle';
import type {
  CreateResearchDraft,
  ResearchDraftResult,
  ResearchRevisionResult,
  ReviewResearchRevision,
  SaveResearchDraft,
  SubmitResearchDraft,
} from '../application/research-lab.commands';

const PRODUCER = 'dss.api.research-lab';

@Injectable()
export class ResearchLabService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(EDITOR_DOCUMENT_NORMALIZER)
    private readonly editor: EditorDocumentNormalizer,
    @Inject(RESEARCH_LAB_AUTHORITY_DECISIONS)
    private readonly authority: ResearchLabAuthorityDecisions,
    private readonly audit: AuditWriterService,
    private readonly outbox: OutboxWriterService,
  ) {}

  async createDraft(
    command: CreateResearchDraft,
  ): Promise<ResearchDraftResult> {
    await this.requireAuthenticated(command.actorId);
    const content = this.normalize(command);
    const pageId = randomUUID();
    const targetId = randomUUID();
    const draftId = randomUUID();
    return this.prisma.$transaction(async (tx) => {
      await tx.interactionTarget.create({
        data: {
          id: targetId,
          kind: 'research-lab.page',
          ownerModule: 'research-lab',
          ownerType: 'ResearchPage',
          ownerId: pageId,
        },
      });
      await tx.researchPage.create({
        data: {
          id: pageId,
          interactionTargetId: targetId,
          creatorId: command.actorId,
          kind: command.kind ?? 'WIKI',
          language: this.language(command.language),
          slug: this.slug(command.proposedSlug),
          protectionLevel: command.protectionLevel ?? 'OPEN',
          visibility: command.visibility ?? 'PUBLIC',
        },
      });
      const draft = await tx.researchDraft.create({
        data: {
          id: draftId,
          pageId,
          authorId: command.actorId,
          ...this.draftData(command, content),
        },
        select: { id: true, version: true },
      });
      await this.record(tx, command.actorId, pageId, 'draft.created', {
        draftId: draft.id,
        version: draft.version,
      });
      return { pageId, draftId: draft.id, version: draft.version };
    });
  }

  async saveDraft(command: SaveResearchDraft): Promise<ResearchDraftResult> {
    await this.requireAuthenticated(command.actorId);
    const content = this.normalize(command);
    const updated = await this.prisma.researchDraft.updateManyAndReturn({
      where: {
        pageId: command.pageId,
        authorId: command.actorId,
        version: command.expectedVersion,
      },
      data: {
        ...this.draftData(command, content),
        version: { increment: 1 },
      },
      select: { id: true, version: true },
    });
    if (updated.length !== 1) {
      throw new ResearchLabCommandError(
        'DRAFT_CONFLICT',
        'The Research Lab draft changed or is no longer available.',
      );
    }
    const [draft] = updated;
    return {
      pageId: command.pageId,
      draftId: draft.id,
      version: draft.version,
    };
  }

  async ownDraft(actorId: string, pageId: string) {
    await this.requireAuthenticated(actorId);
    return this.prisma.researchDraft.findUnique({
      where: { pageId_authorId: { pageId, authorId: actorId } },
    });
  }

  async startDraft(
    actorId: string,
    pageId: string,
  ): Promise<ResearchDraftResult> {
    const facts = await this.authority.viewerFacts(actorId, new Date());
    if (!facts.authenticated) {
      throw new ResearchLabCommandError(
        'ACCESS_DENIED',
        'Authentication required.',
      );
    }
    return this.prisma.$transaction(async (tx) => {
      await this.lockPage(tx, pageId);
      const existing = await tx.researchDraft.findUnique({
        where: { pageId_authorId: { pageId, authorId: actorId } },
        select: { id: true, version: true },
      });
      if (existing)
        return { pageId, draftId: existing.id, version: existing.version };
      const page = await tx.researchPage.findUnique({
        where: { id: pageId },
        include: { publishedRevision: true },
      });
      if (!page || !page.publishedRevision) this.notFound('Published page');
      if (page.protectionLevel !== 'OPEN' && !facts.guardian) {
        throw new ResearchLabCommandError(
          'ACCESS_DENIED',
          'This Research Lab page requires Guardian edit authority.',
        );
      }
      const revision = page.publishedRevision;
      const draft = await tx.researchDraft.create({
        data: {
          pageId,
          authorId: actorId,
          basePublishedRevisionId: revision.id,
          title: revision.title,
          summary: revision.summary,
          proposedSlug: revision.proposedSlug,
          document: revision.document as Prisma.InputJsonValue,
          plainText: revision.plainText,
          searchText: revision.searchText,
          metadata: revision.metadata as Prisma.InputJsonValue,
          coverMediaId: revision.coverMediaId,
        },
        select: { id: true, version: true },
      });
      return { pageId, draftId: draft.id, version: draft.version };
    });
  }

  async submitDraft(
    command: SubmitResearchDraft,
  ): Promise<ResearchRevisionResult> {
    await this.requireAuthenticated(command.actorId);
    return this.prisma.$transaction(async (tx) => {
      await this.lockPage(tx, command.pageId);
      const page = await tx.researchPage.findUnique({
        where: { id: command.pageId },
        select: { id: true, publishedRevisionId: true },
      });
      const draft = await tx.researchDraft.findUnique({
        where: {
          pageId_authorId: {
            pageId: command.pageId,
            authorId: command.actorId,
          },
        },
      });
      if (!page || !draft) this.notFound('Draft');
      if (
        draft.version !== command.expectedVersion ||
        draft.basePublishedRevisionId !== page.publishedRevisionId
      ) {
        throw new ResearchLabCommandError(
          'DRAFT_CONFLICT',
          'The draft is based on a stale Research Lab publication.',
        );
      }
      const latest = await tx.researchRevision.aggregate({
        where: { pageId: page.id },
        _max: { number: true },
      });
      const revision = await tx.researchRevision.create({
        data: {
          pageId: page.id,
          number: (latest._max.number ?? 0) + 1,
          authorId: command.actorId,
          basePublishedRevisionId: draft.basePublishedRevisionId,
          title: draft.title,
          summary: draft.summary,
          proposedSlug: draft.proposedSlug,
          document: draft.document as Prisma.InputJsonValue,
          plainText: draft.plainText,
          searchText: draft.searchText,
          metadata: draft.metadata as Prisma.InputJsonValue,
          coverMediaId: draft.coverMediaId,
          editSummary: this.required(command.editSummary, 'Edit summary'),
          contentHash: this.contentHash(draft.document),
        },
      });
      await tx.researchReviewDecision.create({
        data: {
          pageId: page.id,
          revisionId: revision.id,
          actorId: command.actorId,
          action: 'SUBMITTED',
          policySnapshotHash: this.required(
            command.policySnapshotHash,
            'Policy snapshot hash',
          ),
          auditCorrelationId: this.required(
            command.correlationId,
            'Correlation ID',
          ),
        },
      });
      await tx.researchDraft.delete({ where: { id: draft.id } });
      await this.record(tx, command.actorId, page.id, 'revision.submitted', {
        revisionId: revision.id,
        number: revision.number,
      });
      return this.revisionResult(revision);
    });
  }

  async requestChanges(
    command: ReviewResearchRevision,
  ): Promise<ResearchRevisionResult> {
    return this.decide(command, 'CHANGES_REQUESTED');
  }

  async rejectRevision(
    command: ReviewResearchRevision,
  ): Promise<ResearchRevisionResult> {
    return this.decide(command, 'REJECTED');
  }

  async withdrawRevision(
    command: ReviewResearchRevision,
  ): Promise<ResearchRevisionResult> {
    await this.requireAuthenticated(command.actorId);
    return this.prisma.$transaction(async (tx) => {
      await this.lockPage(tx, command.pageId);
      const revision = await tx.researchRevision.findFirst({
        where: {
          id: command.revisionId,
          pageId: command.pageId,
          authorId: command.actorId,
        },
      });
      if (!revision) this.notFound('Revision');
      return this.transition(tx, command, revision, 'WITHDRAWN');
    });
  }

  async publishRevision(
    command: ReviewResearchRevision,
  ): Promise<ResearchRevisionResult> {
    await this.requireGuardian(command.actorId);
    return this.prisma.$transaction(async (tx) => {
      await this.lockPage(tx, command.pageId);
      const page = await tx.researchPage.findUnique({
        where: { id: command.pageId },
      });
      const revision = await tx.researchRevision.findFirst({
        where: { id: command.revisionId, pageId: command.pageId },
      });
      if (!page || !revision) this.notFound('Revision');
      this.assertTransition(revision.state, 'PUBLISHED');
      if (page.publishedRevisionId) {
        await tx.researchRevision.update({
          where: { id: page.publishedRevisionId },
          data: { state: 'SUPERSEDED' },
        });
      }
      const now = new Date();
      const published = await tx.researchRevision.update({
        where: { id: revision.id },
        data: { state: 'PUBLISHED' },
      });
      await tx.researchPage.update({
        where: { id: page.id },
        data: {
          state: 'ACTIVE',
          slug: this.slug(revision.proposedSlug),
          publishedRevisionId: revision.id,
          publicationGeneration: { increment: 1 },
          firstPublishedAt: page.firstPublishedAt ?? now,
          lastPublishedAt: now,
        },
      });
      await this.appendDecision(tx, command, 'PUBLISHED');
      await this.record(tx, command.actorId, page.id, 'revision.published', {
        revisionId: revision.id,
        selfPublish: revision.authorId === command.actorId,
      });
      return this.revisionResult(published);
    });
  }

  async selfPublishDraft(
    command: SubmitResearchDraft,
  ): Promise<ResearchRevisionResult> {
    await this.requireGuardian(command.actorId);
    return this.prisma.$transaction(async (tx) => {
      await this.lockPage(tx, command.pageId);
      const page = await tx.researchPage.findUnique({
        where: { id: command.pageId },
      });
      const draft = await tx.researchDraft.findUnique({
        where: {
          pageId_authorId: {
            pageId: command.pageId,
            authorId: command.actorId,
          },
        },
      });
      if (!page || !draft) this.notFound('Draft');
      if (
        draft.version !== command.expectedVersion ||
        draft.basePublishedRevisionId !== page.publishedRevisionId
      ) {
        throw new ResearchLabCommandError(
          'DRAFT_CONFLICT',
          'The draft is based on a stale Research Lab publication.',
        );
      }
      const latest = await tx.researchRevision.aggregate({
        where: { pageId: page.id },
        _max: { number: true },
      });
      const now = new Date();
      const revision = await tx.researchRevision.create({
        data: {
          pageId: page.id,
          number: (latest._max.number ?? 0) + 1,
          authorId: command.actorId,
          state: 'PUBLISHED',
          basePublishedRevisionId: draft.basePublishedRevisionId,
          title: draft.title,
          summary: draft.summary,
          proposedSlug: draft.proposedSlug,
          document: draft.document as Prisma.InputJsonValue,
          plainText: draft.plainText,
          searchText: draft.searchText,
          metadata: draft.metadata as Prisma.InputJsonValue,
          coverMediaId: draft.coverMediaId,
          editSummary: this.required(command.editSummary, 'Edit summary'),
          contentHash: this.contentHash(draft.document),
        },
      });
      if (page.publishedRevisionId) {
        await tx.researchRevision.update({
          where: { id: page.publishedRevisionId },
          data: { state: 'SUPERSEDED' },
        });
      }
      const decisionData = {
        pageId: page.id,
        revisionId: revision.id,
        actorId: command.actorId,
        policySnapshotHash: this.required(
          command.policySnapshotHash,
          'Policy snapshot hash',
        ),
        auditCorrelationId: this.required(
          command.correlationId,
          'Correlation ID',
        ),
      };
      await tx.researchReviewDecision.createMany({
        data: [
          { ...decisionData, action: 'SUBMITTED' },
          { ...decisionData, action: 'PUBLISHED' },
        ],
      });
      await tx.researchPage.update({
        where: { id: page.id },
        data: {
          state: 'ACTIVE',
          slug: this.slug(revision.proposedSlug),
          publishedRevisionId: revision.id,
          publicationGeneration: { increment: 1 },
          firstPublishedAt: page.firstPublishedAt ?? now,
          lastPublishedAt: now,
        },
      });
      await tx.researchDraft.delete({ where: { id: draft.id } });
      await this.record(
        tx,
        command.actorId,
        page.id,
        'revision.self_published',
        {
          revisionId: revision.id,
          number: revision.number,
        },
      );
      return this.revisionResult(revision);
    });
  }

  async reviewQueue(actorId: string) {
    await this.requireGuardian(actorId);
    return this.prisma.researchRevision.findMany({
      where: { state: 'IN_REVIEW' },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
  }

  private async decide(
    command: ReviewResearchRevision,
    state: 'CHANGES_REQUESTED' | 'REJECTED',
  ): Promise<ResearchRevisionResult> {
    await this.requireGuardian(command.actorId);
    return this.prisma.$transaction(async (tx) => {
      await this.lockPage(tx, command.pageId);
      const revision = await tx.researchRevision.findFirst({
        where: { id: command.revisionId, pageId: command.pageId },
      });
      if (!revision) this.notFound('Revision');
      return this.transition(tx, command, revision, state);
    });
  }

  private async transition(
    tx: TransactionClient,
    command: ReviewResearchRevision,
    revision: ResearchRevision,
    state: 'CHANGES_REQUESTED' | 'REJECTED' | 'WITHDRAWN',
  ): Promise<ResearchRevisionResult> {
    this.assertTransition(revision.state, state);
    const updated = await tx.researchRevision.update({
      where: { id: revision.id },
      data: { state },
    });
    if (state === 'CHANGES_REQUESTED') {
      await tx.researchDraft.create({
        data: {
          pageId: revision.pageId,
          authorId: revision.authorId,
          basePublishedRevisionId: revision.basePublishedRevisionId,
          title: revision.title,
          summary: revision.summary,
          proposedSlug: revision.proposedSlug,
          document: revision.document as Prisma.InputJsonValue,
          plainText: revision.plainText,
          searchText: revision.searchText,
          metadata: revision.metadata as Prisma.InputJsonValue,
          coverMediaId: revision.coverMediaId,
        },
      });
    }
    await this.appendDecision(tx, command, state);
    await this.record(
      tx,
      command.actorId,
      revision.pageId,
      'revision.' + state.toLowerCase(),
      { revisionId: revision.id, reason: command.reason ?? null },
    );
    return this.revisionResult(updated);
  }

  private async appendDecision(
    tx: TransactionClient,
    command: ReviewResearchRevision,
    action: 'CHANGES_REQUESTED' | 'REJECTED' | 'WITHDRAWN' | 'PUBLISHED',
  ): Promise<void> {
    await tx.researchReviewDecision.create({
      data: {
        pageId: command.pageId,
        revisionId: command.revisionId,
        actorId: command.actorId,
        action,
        reason: command.reason?.trim() || null,
        policySnapshotHash: this.required(
          command.policySnapshotHash,
          'Policy snapshot hash',
        ),
        auditCorrelationId: this.required(
          command.correlationId,
          'Correlation ID',
        ),
      },
    });
  }

  private async lockPage(tx: TransactionClient, pageId: string): Promise<void> {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${'research-lab:page:' + pageId}, 0))`;
  }

  private assertTransition(
    from: string,
    to: Parameters<typeof assertResearchRevisionTransition>[1],
  ): void {
    try {
      assertResearchRevisionTransition(
        from as Parameters<typeof assertResearchRevisionTransition>[0],
        to,
      );
    } catch {
      throw new ResearchLabCommandError(
        'REVISION_CONFLICT',
        `Research Lab revision can no longer transition from ${from} to ${to}.`,
      );
    }
  }

  private async requireAuthenticated(actorId: string): Promise<void> {
    const facts = await this.authority.viewerFacts(actorId, new Date());
    if (!facts.authenticated) {
      throw new ResearchLabCommandError(
        'ACCESS_DENIED',
        'Authentication required.',
      );
    }
  }

  private async requireGuardian(actorId: string): Promise<void> {
    const facts = await this.authority.viewerFacts(actorId, new Date());
    if (!facts.authenticated || !facts.guardian) {
      throw new ResearchLabCommandError(
        'ACCESS_DENIED',
        'Research Lab Guardian authority required.',
      );
    }
  }

  private normalize(input: { documentJson: string }): ValidatedEditorDocument {
    return this.editor.normalizeWiki(input.documentJson);
  }

  private draftData(
    input: {
      title: string;
      summary: string;
      proposedSlug: string;
      metadata?: Readonly<Record<string, unknown>>;
      coverMediaId?: string | null;
    },
    content: ValidatedEditorDocument,
  ) {
    return {
      title: this.required(input.title, 'Title'),
      summary: input.summary.trim(),
      proposedSlug: this.slug(input.proposedSlug),
      document: content.document as Prisma.InputJsonValue,
      plainText: content.plainText,
      searchText: content.searchText,
      metadata: JSON.parse(
        JSON.stringify(input.metadata ?? {}),
      ) as Prisma.InputJsonValue,
      coverMediaId: input.coverMediaId ?? null,
    };
  }

  private revisionResult(revision: {
    id: string;
    pageId: string;
    number: number;
    state: string;
  }): ResearchRevisionResult {
    return {
      pageId: revision.pageId,
      revisionId: revision.id,
      number: revision.number,
      state: revision.state,
    };
  }

  private language(value?: string): string {
    const language = (value ?? 'uk').trim().toLowerCase();
    if (!/^[a-z]{2}(?:-[a-z0-9]{2,8})?$/.test(language)) {
      throw new ResearchLabCommandError(
        'INVALID_STATE',
        'Invalid language tag.',
      );
    }
    return language;
  }

  private slug(value: string): string {
    const slug = value.trim().toLowerCase();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      throw new ResearchLabCommandError(
        'INVALID_STATE',
        'Invalid Research Lab slug.',
      );
    }
    return slug;
  }

  private required(value: string, label: string): string {
    const result = value.trim();
    if (!result) {
      throw new ResearchLabCommandError(
        'INVALID_STATE',
        label + ' is required.',
      );
    }
    return result;
  }

  private contentHash(document: unknown): string {
    return createHash('sha256').update(JSON.stringify(document)).digest('hex');
  }

  private notFound(target: string): never {
    throw new ResearchLabCommandError('NOT_FOUND', target + ' was not found.');
  }

  private async record(
    tx: TransactionClient,
    actorId: string,
    pageId: string,
    action: string,
    metadata: Record<string, string | number | boolean | null>,
  ): Promise<void> {
    await this.audit.append(tx, {
      action: 'research_lab.' + action.replaceAll('.', '_'),
      actorType: 'USER',
      actorId,
      targetType: 'ResearchPage',
      targetId: pageId,
      metadata,
    });
    await this.outbox.append(
      tx,
      createEventEnvelope({
        name: 'research-lab.' + action + '.v1',
        version: 1,
        category: 'integration',
        producer: PRODUCER,
        actorId,
        aggregate: { type: 'ResearchPage', id: pageId },
        payload: { pageId, ...metadata },
      }),
    );
  }
}
