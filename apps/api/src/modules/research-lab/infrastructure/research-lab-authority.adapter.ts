/**
 * DSS File Passport
 * File: apps/api/src/modules/research-lab/infrastructure/research-lab-authority.adapter.ts
 * Purpose: Adapts current Authorization evidence to Research Lab decisions.
 */
import { Inject, Injectable } from '@nestjs/common';
import {
  ACCESS_CAPABILITY_DECISIONS,
  type AccessCapabilityDecisions,
} from '@api/core/authorization';
import type { ResearchLabAuthorityDecisions } from '../contracts/research-lab-authority.contract';
import type { ResearchViewerFacts } from '../domain/types/research-lab.type';

@Injectable()
export class ResearchLabAuthorityAdapter implements ResearchLabAuthorityDecisions {
  constructor(
    @Inject(ACCESS_CAPABILITY_DECISIONS)
    private readonly access: AccessCapabilityDecisions,
  ) {}

  async viewerFacts(
    subjectId: string | null,
    at: Date,
  ): Promise<ResearchViewerFacts> {
    if (!subjectId) return this.denied();
    const [audience, guardian] = await Promise.all([
      this.access.audience(subjectId, at),
      this.access.hasKnowledgeForgeGuardian(subjectId, at),
    ]);
    if (!audience) return this.denied();
    return {
      authenticated: true,
      groups: audience.groups,
      premium: audience.premium,
      guardian,
    };
  }

  private denied(): ResearchViewerFacts {
    return {
      authenticated: false,
      groups: [],
      premium: false,
      guardian: false,
    };
  }
}
