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
 * • validates ALL/ANY policies and requirement values;
 * • evaluates global account facts without receiving protected content;
 * • applies owner and Premium bypass rules explicitly;
 * • fails closed for missing viewers or unmet policy evidence.
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

const MAX_REQUIREMENTS = 6;

@Injectable()
export class ContentGatesService {
  constructor(
    @Inject(CONTENT_GATES_REPOSITORY)
    private readonly gates: ContentGatesRepository,
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
    const facts = await this.gates.viewerFacts(viewerId, now);
    if (!facts)
      throw new NotFoundException('Content Gate viewer was not found.');

    if (gate.ownerId === viewerId) {
      return this.bypass(gate, 'Author preview bypass is active.');
    }
    if (facts.groups.some((group) => group.toLowerCase() === 'premium')) {
      return this.bypass(
        gate,
        'This content is gated, but Premium has unrestricted access.',
      );
    }

    const results = gate.requirements.map((requirement) => ({
      kind: requirement.kind,
      met: this.isMet(requirement, facts),
    }));
    const allowed =
      gate.operator === 'ALL'
        ? results.every(({ met }) => met)
        : results.some(({ met }) => met);
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
