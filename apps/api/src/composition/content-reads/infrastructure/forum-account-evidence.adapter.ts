/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Content Read Integration
 * 📄 File: apps/api/src/composition/content-reads/infrastructure/forum-account-evidence.adapter.ts
 *
 * 🎯 Purpose:
 * Supplies Forum with Auth's minimal account evidence for vote eligibility.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Inject, Injectable } from '@nestjs/common';
import {
  AUTH_ACCOUNT_EVIDENCE,
  type AuthAccountEvidenceReader,
} from '@api/modules/auth';
import type {
  ForumAccountEvidence,
  ForumAccountEvidenceReader,
} from '@api/modules/forum';

@Injectable()
export class ForumAccountEvidenceAdapter implements ForumAccountEvidenceReader {
  constructor(
    @Inject(AUTH_ACCOUNT_EVIDENCE)
    private readonly accounts: AuthAccountEvidenceReader,
  ) {}

  async find(subjectId: string): Promise<ForumAccountEvidence | null> {
    const account = await this.accounts.find(subjectId);
    return account
      ? { active: account.active, createdAt: new Date(account.createdAt) }
      : null;
  }
}
