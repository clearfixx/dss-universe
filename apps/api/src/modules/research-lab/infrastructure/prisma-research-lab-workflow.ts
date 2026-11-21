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
import type {
  ResearchProtectionLevel,
  ResearchVisibility,
} from '../domain/types/research-lab.type';
import { researchAudience } from './research-audience';
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
  EDITOR_DELIVERY_READER,
  type EditorDeliveryReader,
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
  ResearchPublicationCommand,
  RollbackResearchPage,
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
    @Inject(EDITOR_DELIVERY_READER)
    private readonly delivery: EditorDeliveryReader,
  ) {}

  private editorGroups(groups: readonly string[]) {
    return groups
      .filter((key) => key.startsWith('group:'))
      .map((key) => key.slice(6));
  }

  private editProtection(
    groups: readonly string[],
    guardian: boolean,
  ): Prisma.ResearchPageWhereInput {
    return guardian
      ? { protectionLevel: { not: 'LOCKED' } }
      : {
          OR: [
            { protectionLevel: 'OPEN' },
            {
              protectionLevel: 'TRUSTED',
              trustedEditGroupKeys: { hasSome: this.editorGroups(groups) },
            },
          ],
        };
  }

  private async protectionScope(
    actorId: string,
    pageId: string,
  ): Promise<Prisma.ResearchPageWhereInput> {
    const facts = await this.requireGuardian(actorId);
    return {
      id: pageId,
      state: { in: ['ACTIVE', 'DRAFT'] },
      ...researchAudience(facts.groups, true),
    };
  }

  async editPolicy(actorId: string, pageId: string) {
    const page = await this.prisma.researchPage.findFirst({
      where: await this.protectionScope(actorId, pageId),
      select: { protectionLevel: true, trustedEditGroupKeys: true },
    });
    if (!page) this.notFound('Research page');
    return page;
  }

  async setEditProtection(
    actorId: string,
    pageId: string,
    level: ResearchProtectionLevel,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await this.lockPage(tx, pageId);
      const [page] = await tx.researchPage.updateManyAndReturn({
        where: await this.protectionScope(actorId, pageId),
        data: { protectionLevel: level },
        select: { protectionLevel: true, trustedEditGroupKeys: true },
      });
      if (!page) this.notFound('Research page');
      await this.record(tx, actorId, pageId, 'protection.updated', {
        protectionLevel: level,
        policySnapshotHash: await this.policySnapshotHash(tx, pageId),
      });
      return page;
    });
  }

  async setAudience(
    actorId: string,
    pageId: string,
    visibility: ResearchVisibility,
    groupKeys: string[],
  ) {
    return this.prisma.$transaction(async (tx) => {
      await this.lockPage(tx, pageId);
      const at = new Date();
      if (!(await this.authority.canModerate(actorId, at))) {
        throw new ResearchLabCommandError(
          'ACCESS_DENIED',
          'Research Lab moderation permission required.',
        );
      }
      const facts = await this.requireAuthenticated(actorId);
      const page = await tx.researchPage.findFirst({
        where: {
          id: pageId,
          state: { in: ['ACTIVE', 'ARCHIVED'] },
          publishedRevision: { is: { state: 'PUBLISHED' } },
          ...researchAudience(facts.groups, true),
        },
        select: {
          visibility: true,
          audienceGroups: {
            select: { groupKey: true },
            orderBy: { groupKey: 'asc' },
          },
        },
      });
      if (!page) this.notFound('Published page');
      const keys = [...new Set(groupKeys)].sort();
      if (
        (visibility === 'GROUPS') !== keys.length > 0 ||
        keys.some((key) => !/^[a-z][a-z0-9-]{0,63}$/.test(key))
      ) {
        throw new ResearchLabCommandError(
          'INVALID_STATE',
          'Supply group keys only for a group audience, with at least one key.',
        );
      }
      const previous = page.audienceGroups.map((group) => group.groupKey);
      if (
        page.visibility !== visibility ||
        previous.join(',') !== keys.join(',')
      ) {
        await tx.researchPage.update({
          where: { id: pageId },
          data: {
            visibility,
            audienceGroups: {
              deleteMany: {},
              create: keys.map((groupKey) => ({ groupKey })),
            },
          },
        });
        await this.audit.append(tx, {
          action: 'research_lab.audience_updated',
          actorType: 'USER',
          actorId,
          targetType: 'ResearchPage',
          targetId: pageId,
          metadata: {
            previousVisibility: page.visibility,
            visibility,
            previousGroupKeys: previous,
            groupKeys: keys,
          },
        });
        await this.outbox.append(
          tx,
          createEventEnvelope({
            name: 'research-lab.audience.updated.v1',
            version: 1,
            category: 'integration',
            producer: PRODUCER,
            actorId,
            aggregate: { type: 'ResearchPage', id: pageId },
            payload: { pageId },
          }),
        );
      }
      return { visibility, groupKeys: keys };
    });
  }

  async setTrustedEditors(
    actorId: string,
    pageId: string,
    groupKeys: string[],
  ) {
    return this.prisma.$transaction(async (tx) => {
      await this.lockPage(tx, pageId);
      const page = await tx.researchPage.findFirst({
        where: await this.protectionScope(actorId, pageId),
        select: { id: true },
      });
      if (!page) this.notFound('Research page');
      if (
        groupKeys.some(
          (key) => !/^[a-z][a-z0-9-]{0,63}$/.test(key) || key === 'premium',
        )
      )
        throw new ResearchLabCommandError(
          'INVALID_STATE',
          'Invalid trusted edit group key.',
        );
      const keys = [...new Set(groupKeys)].sort();
      await tx.researchPage.update({
        where: { id: pageId },
        data: { protectionLevel: 'TRUSTED', trustedEditGroupKeys: keys },
      });
      await this.record(tx, actorId, pageId, 'protection.updated', {
        protectionLevel: 'TRUSTED',
        policySnapshotHash: await this.policySnapshotHash(tx, pageId),
      });
      return keys;
    });
  }

  async createDraft(
    command: CreateResearchDraft,
  ): Promise<ResearchDraftResult> {
    await this.requireAuthenticated(command.actorId);
    const content = this.normalize(command);
    await this.requireDocumentAccess(command.actorId, content.document);
    const pageId = randomUUID();
    const targetId = randomUUID();
    const draftId = randomUUID();
    return this.prisma.$transaction(async (tx) => {
      const language = this.language(command.language);
      const slug = this.slug(command.proposedSlug);
      await this.reserveRoute(tx, pageId, language, slug);
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
          language,
          slug,
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
    const facts = await this.requireAuthenticated(command.actorId);
    const content = this.normalize(command);
    const where: Prisma.ResearchDraftWhereInput = {
      pageId: command.pageId,
      authorId: command.actorId,
      version: command.expectedVersion,
      page: {
        state: { in: ['DRAFT', 'ACTIVE'] },
        AND: this.editProtection(facts.groups, facts.guardian),
        ...researchAudience(facts.groups, true),
      },
    };
    const stored = await this.prisma.researchDraft.findFirst({
      where,
      select: { id: true, document: true },
    });
    if (!stored)
      throw new ResearchLabCommandError(
        'DRAFT_CONFLICT',
        'The Research Lab draft changed or is no longer available.',
      );
    await this.requireDocumentAccess(command.actorId, stored.document);
    await this.requireDocumentAccess(command.actorId, content.document);
    const updated = await this.prisma.researchDraft.updateManyAndReturn({
      where: { ...where, id: stored.id },
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

  private async ownDraftScope(
    actorId: string,
  ): Promise<Prisma.ResearchDraftWhereInput> {
    const facts = await this.requireAuthenticated(actorId);
    return {
      authorId: actorId,
      page: {
        state: { in: ['DRAFT', 'ACTIVE'] },
        ...researchAudience(facts.groups, true),
      },
    };
  }

  async discardDraft(
    actorId: string,
    pageId: string,
    draftId: string,
    expectedVersion: number,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await this.lockPage(tx, pageId);
      const scope = await this.ownDraftScope(actorId);
      const removed = await tx.researchDraft.deleteMany({
        where: { ...scope, pageId, id: draftId, version: expectedVersion },
      });
      if (removed.count !== 1) {
        throw new ResearchLabCommandError(
          'DRAFT_CONFLICT',
          'Draft changed or is no longer available.',
        );
      }
      const emptyPage = await tx.researchPage.findFirst({
        where: {
          id: pageId,
          state: 'DRAFT',
          publicationGeneration: 0,
          firstPublishedAt: null,
          publishedRevisionId: null,
          revisions: { none: {} },
          drafts: { none: {} },
        },
        select: { interactionTargetId: true, language: true, slug: true },
      });
      if (emptyPage) {
        await this.lockRoute(tx, emptyPage.language, emptyPage.slug);
        await tx.researchPage.delete({ where: { id: pageId } });
        await tx.interactionTarget.update({
          where: { id: emptyPage.interactionTargetId },
          data: { status: 'RETIRED' },
        });
      }
      await this.record(tx, actorId, pageId, 'draft.discarded', {
        draftId,
        version: expectedVersion,
        routeReleased: !!emptyPage,
      });
      return { pageId, draftId, routeReleased: !!emptyPage };
    });
  }

  async ownDrafts(actorId: string, offset: number, limit: number) {
    return this.prisma.researchDraft.findMany({
      where: await this.ownDraftScope(actorId),
      select: { id: true, pageId: true, version: true, updatedAt: true },
      orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
      skip: offset,
      take: limit,
    });
  }

  async ownDraft(actorId: string, pageId: string) {
    const draft = await this.prisma.researchDraft.findFirst({
      where: { ...(await this.ownDraftScope(actorId)), pageId },
    });
    if (draft) await this.requireDocumentAccess(actorId, draft.document);
    return draft;
  }

  async startDraft(
    actorId: string,
    pageId: string,
  ): Promise<ResearchDraftResult> {
    return this.prisma.$transaction(async (tx) => {
      await this.lockPage(tx, pageId);
      const facts = await this.authority.viewerFacts(actorId, new Date());
      if (!facts.authenticated) {
        throw new ResearchLabCommandError(
          'ACCESS_DENIED',
          'Authentication required.',
        );
      }
      const page = await tx.researchPage.findFirst({
        where: {
          id: pageId,
          state: 'ACTIVE',
          ...researchAudience(facts.groups, true),
        },
        include: { publishedRevision: true },
      });
      if (!page || !page.publishedRevision) this.notFound('Published page');
      this.assertPublishable(page);
      if (
        page.protectionLevel !== 'OPEN' &&
        !facts.guardian &&
        !(
          page.protectionLevel === 'TRUSTED' &&
          this.editorGroups(facts.groups).some((key) =>
            page.trustedEditGroupKeys.includes(key),
          )
        )
      ) {
        throw new ResearchLabCommandError(
          'ACCESS_DENIED',
          'You do not have edit access to this Research Lab page.',
        );
      }
      const existing = await tx.researchDraft.findUnique({
        where: { pageId_authorId: { pageId, authorId: actorId } },
        select: { id: true, version: true },
      });
      if (existing)
        return { pageId, draftId: existing.id, version: existing.version };
      const revision = page.publishedRevision;
      await this.requireDocumentAccess(actorId, revision.document);
      const projection = await this.repairRevisionText(tx, revision);
      const draft = await tx.researchDraft.create({
        data: {
          pageId,
          authorId: actorId,
          basePublishedRevisionId: revision.id,
          title: revision.title,
          summary: revision.summary,
          proposedSlug: revision.proposedSlug,
          document: revision.document as Prisma.InputJsonValue,
          plainText: projection.plainText,
          searchText: projection.searchText,
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
    return this.prisma.$transaction(async (tx) => {
      await this.lockPage(tx, command.pageId);
      const facts = await this.requireAuthenticated(command.actorId);
      const page = await tx.researchPage.findFirst({
        where: {
          id: command.pageId,
          AND: this.editProtection(facts.groups, facts.guardian),
          ...researchAudience(facts.groups, true),
        },
        select: {
          id: true,
          state: true,
          protectionLevel: true,
          publishedRevisionId: true,
        },
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
      await this.requireDocumentAccess(command.actorId, draft.document);
      this.assertPublishable(page);
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
          policySnapshotHash:
            command.policySnapshotHash ??
            (await this.policySnapshotHash(tx, command.pageId)),
          auditCorrelationId: this.required(
            command.correlationId,
            'Correlation ID',
          ),
        },
      });
      await this.consumeDraft(tx, draft.id, command.expectedVersion);
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
    return this.prisma.$transaction(async (tx) => {
      await this.lockPage(tx, command.pageId);
      const facts = await this.requireAuthenticated(command.actorId);
      const revision = await tx.researchRevision.findFirst({
        where: {
          id: command.revisionId,
          pageId: command.pageId,
          authorId: command.actorId,
          page: {
            state: { in: ['DRAFT', 'ACTIVE'] },
            ...researchAudience(facts.groups, true),
          },
        },
      });
      if (!revision) this.notFound('Revision');
      return this.transition(tx, command, revision, 'WITHDRAWN');
    });
  }

  async publishRevision(
    command: ReviewResearchRevision,
  ): Promise<ResearchRevisionResult> {
    return this.prisma.$transaction(async (tx) => {
      await this.lockPage(tx, command.pageId);
      const facts = await this.requireGuardian(command.actorId);
      const page = await tx.researchPage.findFirst({
        where: { id: command.pageId, ...researchAudience(facts.groups, true) },
      });
      const revision = await tx.researchRevision.findFirst({
        where: { id: command.revisionId, pageId: command.pageId },
      });
      if (!page || !revision) this.notFound('Revision');
      this.assertPublishable(page);
      if (revision.basePublishedRevisionId !== page.publishedRevisionId) {
        throw new ResearchLabCommandError(
          'REVISION_CONFLICT',
          'The reviewed revision is based on a stale publication.',
        );
      }
      await this.requireDocumentAccess(command.actorId, revision.document);
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
          slug: await this.reserveRoute(
            tx,
            page.id,
            page.language,
            this.slug(revision.proposedSlug),
            page.slug,
            !!page.publishedRevisionId,
          ),
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
    return this.prisma.$transaction(async (tx) => {
      await this.lockPage(tx, command.pageId);
      const facts = await this.requireGuardian(command.actorId);
      const page = await tx.researchPage.findFirst({
        where: { id: command.pageId, ...researchAudience(facts.groups, true) },
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
      await this.requireDocumentAccess(command.actorId, draft.document);
      this.assertPublishable(page);
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
        policySnapshotHash:
          command.policySnapshotHash ??
          (await this.policySnapshotHash(tx, command.pageId)),
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
          slug: await this.reserveRoute(
            tx,
            page.id,
            page.language,
            this.slug(revision.proposedSlug),
            page.slug,
            !!page.publishedRevisionId,
          ),
          publishedRevisionId: revision.id,
          publicationGeneration: { increment: 1 },
          firstPublishedAt: page.firstPublishedAt ?? now,
          lastPublishedAt: now,
        },
      });
      await this.consumeDraft(tx, draft.id, command.expectedVersion);
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

  private async reviewScope(
    actorId: string,
  ): Promise<Prisma.ResearchRevisionWhereInput> {
    const facts = await this.requireGuardian(actorId);
    return {
      state: 'IN_REVIEW',
      page: {
        state: { in: ['DRAFT', 'ACTIVE'] },
        ...researchAudience(facts.groups, true),
      },
    };
  }

  async reviewRevision(actorId: string, pageId: string, revisionId: string) {
    const revision = await this.prisma.researchRevision.findFirst({
      where: { ...(await this.reviewScope(actorId)), pageId, id: revisionId },
      select: {
        id: true,
        pageId: true,
        number: true,
        title: true,
        summary: true,
        editSummary: true,
        document: true,
      },
    });
    if (!revision) return null;
    const { document, ...metadata } = revision;
    const view = await this.delivery.project(JSON.stringify(document), actorId);
    return { ...metadata, documentJson: view.documentJson };
  }

  async reviewQueue(actorId: string, offset = 0, limit = 50) {
    return this.prisma.researchRevision.findMany({
      where: await this.reviewScope(actorId),
      skip: offset,
      take: limit,
      select: { id: true, pageId: true, number: true, createdAt: true },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
  }

  async rollback(
    command: RollbackResearchPage,
  ): Promise<ResearchRevisionResult> {
    return this.prisma.$transaction(async (tx) => {
      await this.lockPage(tx, command.pageId);
      const facts = await this.requireGuardian(command.actorId);
      const page = await tx.researchPage.findFirst({
        where: { id: command.pageId, ...researchAudience(facts.groups, true) },
      });
      const source = await tx.researchRevision.findFirst({
        where: {
          id: command.revisionId,
          pageId: command.pageId,
          state: { in: ['PUBLISHED', 'SUPERSEDED'] },
        },
      });
      if (!page || !source || !page.publishedRevisionId) {
        this.notFound('Published revision');
      }
      if (page.state !== 'ACTIVE' || page.protectionLevel === 'LOCKED') {
        throw new ResearchLabCommandError(
          'INVALID_STATE',
          'Rollback requires an active, unlocked Research Lab page.',
        );
      }
      await this.requireDocumentAccess(command.actorId, source.document);
      const projection = await this.repairRevisionText(tx, source);
      this.assertGeneration(
        page.publicationGeneration,
        command.expectedPublicationGeneration,
      );
      const latest = await tx.researchRevision.aggregate({
        where: { pageId: page.id },
        _max: { number: true },
      });
      const revision = await tx.researchRevision.create({
        data: {
          pageId: page.id,
          number: (latest._max.number ?? 0) + 1,
          authorId: command.actorId,
          state: 'PUBLISHED',
          basePublishedRevisionId: page.publishedRevisionId,
          rollbackFromRevisionId: source.id,
          title: source.title,
          summary: source.summary,
          proposedSlug: page.slug,
          document: source.document as Prisma.InputJsonValue,
          plainText: projection.plainText,
          searchText: projection.searchText,
          metadata: source.metadata as Prisma.InputJsonValue,
          coverMediaId: source.coverMediaId,
          editSummary: this.required(
            command.reason ?? 'Rollback',
            'Rollback reason',
          ),
          contentHash: source.contentHash,
        },
      });
      await tx.researchRevision.update({
        where: { id: page.publishedRevisionId },
        data: { state: 'SUPERSEDED' },
      });
      await tx.researchPage.update({
        where: { id: page.id },
        data: {
          state: 'ACTIVE',
          publishedRevisionId: revision.id,
          publicationGeneration: { increment: 1 },
          lastPublishedAt: new Date(),
          archivedAt: null,
          tombstonedAt: null,
          tombstonedById: null,
          tombstoneReason: null,
        },
      });
      await tx.interactionTarget.update({
        where: { id: page.interactionTargetId },
        data: { status: 'ACTIVE' },
      });
      await this.appendLifecycleDecision(
        tx,
        command,
        revision.id,
        'ROLLED_BACK',
      );
      await this.record(tx, command.actorId, page.id, 'revision.rolled_back', {
        revisionId: revision.id,
        rollbackFromRevisionId: source.id,
        publicationGeneration: page.publicationGeneration + 1,
      });
      return this.revisionResult(revision);
    });
  }

  async archive(command: ResearchPublicationCommand): Promise<void> {
    await this.changePageState(command, 'ARCHIVED');
  }

  async restore(command: ResearchPublicationCommand): Promise<void> {
    await this.changePageState(command, 'ACTIVE');
  }

  async tombstone(command: ResearchPublicationCommand): Promise<void> {
    const reason = this.required(command.reason ?? '', 'Tombstone reason');
    await this.prisma.$transaction(async (tx) => {
      await this.lockPage(tx, command.pageId);
      if (!(await this.authority.canModerate(command.actorId, new Date()))) {
        throw new ResearchLabCommandError(
          'ACCESS_DENIED',
          'Research Lab moderation permission required.',
        );
      }
      const page = await tx.researchPage.findUnique({
        where: { id: command.pageId },
      });
      if (!page || !page.publishedRevisionId) this.notFound('Published page');
      this.assertGeneration(
        page.publicationGeneration,
        command.expectedPublicationGeneration,
      );
      if (page.state === 'TOMBSTONED') {
        throw new ResearchLabCommandError(
          'REVISION_CONFLICT',
          'Research Lab page is already tombstoned.',
        );
      }
      await tx.researchPage.update({
        where: { id: page.id },
        data: {
          state: 'TOMBSTONED',
          tombstonedAt: new Date(),
          tombstonedById: command.actorId,
          tombstoneReason: reason,
        },
      });
      await tx.interactionTarget.update({
        where: { id: page.interactionTargetId },
        data: { status: 'RETIRED' },
      });
      await this.record(
        tx,
        command.actorId,
        page.id,
        'page.tombstoned',
        { publicationGeneration: page.publicationGeneration },
        {
          reason,
          correlationId: this.required(command.correlationId, 'Correlation ID'),
        },
      );
    });
  }

  private async decide(
    command: ReviewResearchRevision,
    state: 'CHANGES_REQUESTED' | 'REJECTED',
  ): Promise<ResearchRevisionResult> {
    return this.prisma.$transaction(async (tx) => {
      await this.lockPage(tx, command.pageId);
      const facts = await this.requireGuardian(command.actorId);
      const revision = await tx.researchRevision.findFirst({
        where: {
          id: command.revisionId,
          pageId: command.pageId,
          page: {
            state: { in: ['DRAFT', 'ACTIVE'] },
            ...researchAudience(facts.groups, true),
          },
        },
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
      await tx.researchDraft.upsert({
        where: {
          pageId_authorId: {
            pageId: revision.pageId,
            authorId: revision.authorId,
          },
        },
        update: {},
        create: {
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
      { revisionId: revision.id },
      { reason: command.reason, correlationId: command.correlationId },
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
        policySnapshotHash:
          command.policySnapshotHash ??
          (await this.policySnapshotHash(tx, command.pageId)),
        auditCorrelationId: this.required(
          command.correlationId,
          'Correlation ID',
        ),
      },
    });
  }

  private async appendLifecycleDecision(
    tx: TransactionClient,
    command: ResearchPublicationCommand,
    revisionId: string,
    action: 'ROLLED_BACK' | 'RESTORED',
  ): Promise<void> {
    await tx.researchReviewDecision.create({
      data: {
        pageId: command.pageId,
        revisionId,
        actorId: command.actorId,
        action,
        reason: command.reason?.trim() || null,
        policySnapshotHash:
          command.policySnapshotHash ??
          (await this.policySnapshotHash(tx, command.pageId)),
        auditCorrelationId: this.required(
          command.correlationId,
          'Correlation ID',
        ),
      },
    });
  }

  private async changePageState(
    command: ResearchPublicationCommand,
    state: 'ARCHIVED' | 'ACTIVE',
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await this.lockPage(tx, command.pageId);
      const facts = await this.requireGuardian(command.actorId);
      const page = await tx.researchPage.findFirst({
        where: { id: command.pageId, ...researchAudience(facts.groups, true) },
      });
      if (!page || !page.publishedRevisionId) this.notFound('Published page');
      this.assertGeneration(
        page.publicationGeneration,
        command.expectedPublicationGeneration,
      );
      const expected = state === 'ARCHIVED' ? 'ACTIVE' : 'ARCHIVED';
      if (page.state !== expected) {
        throw new ResearchLabCommandError(
          'REVISION_CONFLICT',
          `Research Lab page cannot transition from ${page.state} to ${state}.`,
        );
      }
      await tx.researchPage.update({
        where: { id: page.id },
        data: {
          state,
          archivedAt: state === 'ARCHIVED' ? new Date() : null,
        },
      });
      await tx.interactionTarget.update({
        where: { id: page.interactionTargetId },
        data: { status: state === 'ARCHIVED' ? 'LOCKED' : 'ACTIVE' },
      });
      if (state === 'ACTIVE') {
        await this.appendLifecycleDecision(
          tx,
          command,
          page.publishedRevisionId,
          'RESTORED',
        );
      }
      await this.record(
        tx,
        command.actorId,
        page.id,
        state === 'ARCHIVED' ? 'page.archived' : 'page.restored',
        { publicationGeneration: page.publicationGeneration },
      );
    });
  }

  private assertPublishable(page: {
    state: string;
    protectionLevel: string;
  }): void {
    if (
      page.state === 'ARCHIVED' ||
      page.state === 'TOMBSTONED' ||
      page.protectionLevel === 'LOCKED'
    ) {
      throw new ResearchLabCommandError(
        'INVALID_STATE',
        'This Research Lab page is closed to publication.',
      );
    }
  }

  private assertGeneration(current: number, expected: number): void {
    if (current !== expected) {
      throw new ResearchLabCommandError(
        'REVISION_CONFLICT',
        `Research Lab publication generation changed from ${expected} to ${current}.`,
      );
    }
  }

  private async consumeDraft(
    tx: TransactionClient,
    id: string,
    version: number,
  ): Promise<void> {
    const removed = await tx.researchDraft.deleteMany({
      where: { id, version },
    });
    if (removed.count !== 1) {
      throw new ResearchLabCommandError(
        'DRAFT_CONFLICT',
        'Draft changed during submission.',
      );
    }
  }

  private async lockRoute(
    tx: TransactionClient,
    language: string,
    route: string,
  ) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${'research-lab:route:' + language + ':' + route},0))`;
  }

  private async reserveRoute(
    tx: TransactionClient,
    pageId: string,
    language: string,
    slug: string,
    previous?: string,
    published = false,
  ): Promise<string> {
    if (previous === slug) return slug;
    const routes = Array.from(
      new Set(previous ? [previous, slug] : [slug]),
    ).sort();
    for (const route of routes) {
      await this.lockRoute(tx, language, route);
    }
    const alias = await tx.researchSlugAlias.findUnique({
      where: { language_slug: { language, slug } },
      select: { id: true, pageId: true },
    });
    const canonical = await tx.researchPage.findUnique({
      where: { language_slug: { language, slug } },
      select: { id: true },
    });
    if (
      (alias && alias.pageId !== pageId) ||
      (canonical && canonical.id !== pageId)
    ) {
      throw new ResearchLabCommandError(
        'REVISION_CONFLICT',
        'This Research Lab route is already reserved.',
      );
    }
    if (alias) await tx.researchSlugAlias.delete({ where: { id: alias.id } });
    if (previous && published)
      await tx.researchSlugAlias.create({
        data: { pageId, language, slug: previous },
      });
    return slug;
  }
  private async policySnapshotHash(tx: TransactionClient, pageId: string) {
    const policy = await tx.researchPage.findUniqueOrThrow({
      where: { id: pageId },
      select: {
        visibility: true,
        protectionLevel: true,
        trustedEditGroupKeys: true,
        audienceGroups: {
          orderBy: { groupKey: 'asc' },
          select: { groupKey: true },
        },
      },
    });
    return createHash('sha256').update(JSON.stringify(policy)).digest('hex');
  }
  private async repairRevisionText(
    tx: TransactionClient,
    revision: ResearchRevision,
  ) {
    if (this.contentHash(revision.document) !== revision.contentHash) {
      throw new ResearchLabCommandError(
        'REVISION_CONFLICT',
        'The stored Research Lab revision does not match its publication hash.',
      );
    }
    const { plainText, searchText } = this.editor.normalizeWiki(
      JSON.stringify(revision.document),
    );
    if (
      plainText !== revision.plainText ||
      searchText !== revision.searchText
    ) {
      await tx.researchRevision.update({
        where: { id: revision.id, contentHash: revision.contentHash },
        data: { plainText, searchText },
      });
    }
    return { plainText, searchText };
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

  private async requireAuthenticated(actorId: string) {
    const facts = await this.authority.viewerFacts(actorId, new Date());
    if (!facts.authenticated) {
      throw new ResearchLabCommandError(
        'ACCESS_DENIED',
        'Authentication required.',
      );
    }
    return facts;
  }

  private async requireGuardian(actorId: string) {
    const facts = await this.authority.viewerFacts(actorId, new Date());
    if (!facts.authenticated || !facts.guardian) {
      throw new ResearchLabCommandError(
        'ACCESS_DENIED',
        'Research Lab Guardian authority required.',
      );
    }
    return facts;
  }

  private async requireDocumentAccess(
    actorId: string,
    document: unknown,
  ): Promise<void> {
    const view = await this.delivery.project(JSON.stringify(document), actorId);
    if (view.gates.some((gate) => !gate.allowed)) {
      throw new ResearchLabCommandError(
        'ACCESS_DENIED',
        'Full document access is required to edit this revision.',
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
    auditContext?: { reason?: string; correlationId: string },
  ): Promise<void> {
    await this.audit.append(tx, {
      action: 'research_lab.' + action.replaceAll('.', '_'),
      actorType: 'USER',
      actorId,
      targetType: 'ResearchPage',
      targetId: pageId,
      ...auditContext,
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
