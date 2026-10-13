/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Access Group Composition
 * 📄 File: apps/api/src/composition/access-groups/infrastructure/auth-eligibility.adapter.ts
 *
 * 🎯 Purpose:
 * Translates published Auth eligibility into an Authorization-owned evidence port.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Inject, Injectable } from '@nestjs/common';
import {
  AUTH_SUBJECT_ELIGIBILITY,
  type AuthSubjectEligibility,
} from '@api/modules/auth';
import type { SubjectEligibilityReader } from '@api/core/authorization';
@Injectable()
export class AuthEligibilityAdapter implements SubjectEligibilityReader {
  constructor(
    @Inject(AUTH_SUBJECT_ELIGIBILITY)
    private readonly source: AuthSubjectEligibility,
  ) {}
  isEligible(subjectId: string): Promise<boolean> {
    return this.source.isEligible(subjectId);
  }
}
