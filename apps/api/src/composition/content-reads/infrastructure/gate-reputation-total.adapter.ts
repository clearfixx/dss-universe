/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Content Read Composition
 * 📄 File: apps/api/src/composition/content-reads/infrastructure/gate-reputation-total.adapter.ts
 *
 * 🎯 Purpose:
 * Binds scalar ledger totals to Content Access without exposing history.
 *
 * 🧠 Responsibilities:
 * • forwards only the recipient coordinate;
 * • propagates signed totals and owner failures.
 *
 * 🏗️ Architecture:
 * Root adapter; all aggregate query semantics stay with Reputation.
 *
 * ⚠️ Important:
 * Do not replace failed evidence with zero.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Inject, Injectable } from '@nestjs/common';
import {
  REPUTATION_TOTAL_READER,
  type ReputationTotalReader,
} from '@api/modules/reputation';
import type { GateReputationTotalReader } from '@api/modules/content-access';
@Injectable()
export class GateReputationTotalAdapter implements GateReputationTotalReader {
  constructor(
    @Inject(REPUTATION_TOTAL_READER)
    private readonly reputation: ReputationTotalReader,
  ) {}
  totalFor(recipientId: string): Promise<number> {
    return this.reputation.totalFor(recipientId);
  }
}
