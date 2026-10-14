/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Content Read Composition
 * 📄 File: apps/api/src/composition/content-reads/infrastructure/gate-account-evidence.adapter.ts
 *
 * 🎯 Purpose:
 * Maps published account evidence into the Content Access-owned input.
 *
 * 🧠 Responsibilities:
 * • selects only active status and a copied creation timestamp;
 * • preserves missing results and propagates owner failures.
 *
 * 🏗️ Architecture:
 * Root adapter; account ownership stays in Auth and age policy in Content Access.
 *
 * ⚠️ Important:
 * No profile fields or credentials cross this boundary.
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
  GateAccountEvidenceReader,
  GateAccountEvidence,
} from '@api/modules/content-access';
@Injectable()
export class GateAccountEvidenceAdapter implements GateAccountEvidenceReader {
  constructor(
    @Inject(AUTH_ACCOUNT_EVIDENCE)
    private readonly accounts: AuthAccountEvidenceReader,
  ) {}
  async find(subjectId: string): Promise<GateAccountEvidence | null> {
    const account = await this.accounts.find(subjectId);
    return account
      ? { active: account.active, createdAt: new Date(account.createdAt) }
      : null;
  }
}
