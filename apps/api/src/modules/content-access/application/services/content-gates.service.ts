/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Content Access
 * 📄 File: apps/api/src/modules/content-access/application/services/content-gates.service.ts
 *
 * 🎯 Purpose:
 * Creates bounded Content Gate policies and evaluates viewer eligibility.
 *
 * 🧠 Responsibilities:
 * • checks audience membership before ALL/ANY numeric thresholds;
 * • evaluates global account facts without receiving protected content;
 * • applies author/Premium threshold bypass without overriding audience;
 * • fails closed for missing viewers or unmet policy evidence.
 * • shares private viewer evidence only inside an explicitly closed batch scope.
 *
 * 🏗️ Architecture:
 * Content Access policy; viewer statistics enter through its own fact-composition service.
 *
 * ⚠️ Important:
 * Audience checks precede numeric bypass; foreign storage is never accessed here.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  CONTENT_GATES_REPOSITORY,
  type ContentGatesRepository,
} from '../../domain/repositories/content-gates.repository.interface';
import type {
  ContentGate,
  ContentGateEvaluation,
  ContentGateRequirement,
  ContentGateViewerFacts,
  CreateContentGate,
} from '../../domain/types/content-gate.type';
import {
  CONTENT_AUDIENCE_READER,
  type ContentAudienceReader,
} from '../../domain/ports/content-audience-reader.interface';

import { ContentGateViewerFactsService } from './content-gate-viewer-facts.service';

const MAX_REQUIREMENTS = 6;
type ViewerEvidence = readonly [
  Awaited<ReturnType<ContentGateViewerFactsService['read']>>,
  Awaited<ReturnType<ContentAudienceReader['read']>>,
];

@Injectable()
export class ContentGatesService {
  constructor(
    @Inject(CONTENT_GATES_REPOSITORY)
    private readonly gates: ContentGatesRepository,
    @Inject(CONTENT_AUDIENCE_READER)
    private readonly audience: ContentAudienceReader,
    private readonly viewerFacts: ContentGateViewerFactsService,
  ) {}

  create(input: CreateContentGate): Promise<ContentGate> {
    this.validate(input);
    return this.gates.create(input);
  }

  async evaluate(
    gateId: string,
    viewerId: string | null,
    now = new Date(),
  ): Promise<ContentGateEvaluation> {
    return this.evaluateUsing(gateId, viewerId, () =>
      this.readEvidence(viewerId!, now),
    );
  }

  openViewerScope(viewerId: string) {
    if (!viewerId.trim())
      throw new BadRequestException('Content Gate scope requires a viewer.');
    const at = new Date();
    let closed = false;
    let evidence: Promise<ViewerEvidence> | undefined;
    const read = () => {
      if (closed)
        return Promise.reject<ViewerEvidence>(
          new Error('Content Gate evaluation scope is closed.'),
        );
      return (evidence ??= this.readEvidence(viewerId, at));
    };
    return {
      evaluate: async (gateId: string): Promise<ContentGateEvaluation> => {
        if (closed) throw new Error('Content Gate evaluation scope is closed.');
        const result = await this.evaluateUsing(gateId, viewerId, read);
        if (closed) throw new Error('Content Gate evaluation scope is closed.');
        return result;
      },
      close: () => {
        closed = true;
        evidence = undefined;
      },
    };
  }

  private async readEvidence(
    viewerId: string,
    at: Date,
  ): Promise<ViewerEvidence> {
    const [statistics, access] = await Promise.allSettled([
      Promise.resolve().then(() => this.viewerFacts.read(viewerId, at)),
      Promise.resolve().then(() => this.audience.read(viewerId, at)),
    ]);
    if (statistics.status === 'rejected') {
      const failure: unknown = statistics.reason;
      throw failure;
    }
    if (access.status === 'rejected') {
      const failure: unknown = access.reason;
      throw failure;
    }
    return [statistics.value, access.value];
  }

  private async evaluateUsing(
    gateId: string,
    viewerId: string | null,
    readEvidence: () => Promise<ViewerEvidence>,
  ): Promise<ContentGateEvaluation> {
    const gate = await this.gates.findById(gateId);
    if (!gate) throw new NotFoundException('Content Gate was not found.');
    if (!viewerId) {
      return {
        gate,
        allowed: false,
        bypassed: false,
        unmet: gate.requirements.map(({ kind }) => kind),
        notice: 'Sign in to check hidden content requirements.',
      };
    }
    const [statistics, access] = await readEvidence();
    if (!statistics || !access)
      throw new NotFoundException('Content Gate viewer was not found.');
    const facts = { ...statistics, groups: [...access.groups] };

    const audience = gate.requirements.filter(({ kind }) => kind === 'GROUP');
    if (audience.some((requirement) => !this.isMet(requirement, facts))) {
      return {
        gate,
        allowed: false,
        bypassed: false,
        unmet: ['GROUP'],
        notice: 'Content audience requirements are not satisfied.',
      };
    }
    const thresholds = gate.requirements.filter(({ kind }) => kind !== 'GROUP');
    if (thresholds.length > 0 && gate.ownerId === viewerId) {
      return this.bypass(gate, 'Author preview bypass is active.');
    }
    if (thresholds.length > 0 && access.premium) {
      return this.bypass(
        gate,
        'Premium bypasses numeric thresholds within the permitted audience.',
      );
    }

    const results = thresholds.map((requirement) => ({
      kind: requirement.kind,
      met: this.isMet(requirement, facts),
    }));
    const allowed =
      results.length === 0 ||
      (gate.operator === 'ALL'
        ? results.every(({ met }) => met)
        : results.some(({ met }) => met));
    return {
      gate,
      allowed,
      bypassed: false,
      unmet: results.filter(({ met }) => !met).map(({ kind }) => kind),
      notice: allowed
        ? 'Content Gate requirements are satisfied.'
        : 'Hidden content requirements are not satisfied.',
    };
  }

  private validate(input: CreateContentGate): void {
    if (
      input.requirements.length < 1 ||
      input.requirements.length > MAX_REQUIREMENTS
    ) {
      throw new BadRequestException(
        'Content Gate requires between 1 and 6 requirements.',
      );
    }
    if (
      new Set(input.requirements.map(({ kind }) => kind)).size !==
      input.requirements.length
    ) {
      throw new BadRequestException(
        'Content Gate requirement kinds must be unique.',
      );
    }
    for (const requirement of input.requirements) {
      if (requirement.kind === 'GROUP') {
        if (!requirement.groupKey?.trim() || requirement.threshold !== null) {
          throw new BadRequestException(
            'GROUP requires groupKey and no threshold.',
          );
        }
      } else if (
        requirement.groupKey !== null ||
        requirement.threshold === null ||
        !Number.isSafeInteger(requirement.threshold) ||
        requirement.threshold < 0
      ) {
        throw new BadRequestException(
          `${requirement.kind} requires a non-negative integer threshold.`,
        );
      }
    }
  }

  private isMet(
    requirement: ContentGateRequirement,
    facts: ContentGateViewerFacts,
  ): boolean {
    if (requirement.kind === 'GROUP') {
      return facts.groups.some(
        (group) => group.toLowerCase() === requirement.groupKey?.toLowerCase(),
      );
    }
    const values = {
      ACCOUNT_AGE_DAYS: facts.accountAgeDays,
      COMMENTS: facts.comments,
      FORUM_POSTS: facts.forumPosts,
      PUBLICATIONS: facts.publications,
      REPUTATION: facts.reputation,
    } as const;
    return values[requirement.kind] >= (requirement.threshold ?? 0);
  }

  private bypass(gate: ContentGate, notice: string): ContentGateEvaluation {
    return { gate, allowed: true, bypassed: true, unmet: [], notice };
  }
}

/** A lock with no server-side key is merely decorative. This one is not. */
