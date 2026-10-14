/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Reputation Composition
 * 📄 File: apps/api/src/composition/reputation/infrastructure/reputation-block.adapter.ts
 *
 * 🎯 Purpose:
 * Translates the published Users block decision into the Reputation safety port.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Inject, Injectable } from '@nestjs/common';
import {
  USER_BLOCK_DECISIONS,
  type UserBlockDecisionReader,
} from '@api/modules/users';
import type { ReputationBlockReader } from '@api/modules/reputation';
@Injectable()
export class ReputationBlockAdapter implements ReputationBlockReader {
  constructor(
    @Inject(USER_BLOCK_DECISIONS)
    private readonly source: UserBlockDecisionReader,
  ) {}
  isBlocked(first: string, second: string) {
    return this.source.isBlocked(first, second);
  }
}
