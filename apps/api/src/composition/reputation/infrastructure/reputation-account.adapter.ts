/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Reputation Composition
 * 📄 File: apps/api/src/composition/reputation/infrastructure/reputation-account.adapter.ts
 *
 * 🎯 Purpose:
 * Adapts published Auth evidence to Reputation-owned facts without profile reads.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Inject, Injectable } from '@nestjs/common';
import {
  AUTH_ACCOUNT_EVIDENCE,
  type AuthAccountEvidenceReader,
} from '@api/modules/auth';
import type { ReputationAccountReader } from '@api/modules/reputation';
@Injectable()
export class ReputationAccountAdapter implements ReputationAccountReader {
  constructor(
    @Inject(AUTH_ACCOUNT_EVIDENCE)
    private readonly source: AuthAccountEvidenceReader,
  ) {}
  async find(subjectId: string) {
    const evidence = await this.source.find(subjectId);
    return evidence
      ? { active: evidence.active, createdAt: new Date(evidence.createdAt) }
      : null;
  }
}
