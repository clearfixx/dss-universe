/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Content Read Integration
 * 📄 File: apps/api/src/composition/content-reads/infrastructure/gate-viewer-restriction.adapter.ts
 *
 * 🎯 Purpose:
 * Supplies Content Access with Moderation's current read-only fact.
 *
 * ⚠️ Important:
 * Only the boolean crosses the boundary; sanction details stay in Moderation.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Inject, Injectable } from '@nestjs/common';
import type { GateViewerRestrictionReader } from '@api/modules/content-access';
import {
  SANCTION_STATE_READER,
  type SanctionStateReader,
} from '@api/modules/moderation';

@Injectable()
export class GateViewerRestrictionAdapter implements GateViewerRestrictionReader {
  constructor(
    @Inject(SANCTION_STATE_READER)
    private readonly sanctions: SanctionStateReader,
  ) {}

  async isReadOnly(subjectId: string, at: Date): Promise<boolean> {
    return (await this.sanctions.readOnlyUntil(subjectId, at)) !== null;
  }
}
