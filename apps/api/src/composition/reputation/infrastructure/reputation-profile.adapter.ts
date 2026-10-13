/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Reputation Composition
 * 📄 File: apps/api/src/composition/reputation/infrastructure/reputation-profile.adapter.ts
 *
 * 🎯 Purpose:
 * Adapts profile existence without exposing account state to public history lookup.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Inject, Injectable } from '@nestjs/common';
import {
  PROFILE_EXISTENCE_READER,
  type ProfileExistenceReader,
} from '@api/modules/users';
import type { ReputationProfileExistence } from '@api/modules/reputation';
@Injectable()
export class ReputationProfileAdapter implements ReputationProfileExistence {
  constructor(
    @Inject(PROFILE_EXISTENCE_READER)
    private readonly source: ProfileExistenceReader,
  ) {}
  exists(subjectId: string) {
    return this.source.exists(subjectId);
  }
}
