/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: IAM Subject Read Composition
 * 📄 File: apps/api/src/composition/iam-subject-reads/infrastructure/auth-subject-existence.adapter.ts
 *
 * 🎯 Purpose:
 * Binds IAM's existence input to the authoritative Auth contract without eligibility policy.
 *
 * ⚠️ Important:
 * Existence is not authentication; preserve all-state ID-only semantics.
 * Independent reads do not introduce a snapshot or permission decision.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Inject, Injectable } from '@nestjs/common';
import {
  AUTH_SUBJECT_EXISTENCE_READER,
  type AuthSubjectExistenceReader,
} from '@api/modules/auth';
import type { IamSubjectExistenceReader } from '@api/modules/iam';
@Injectable()
export class AuthSubjectExistenceAdapter implements IamSubjectExistenceReader {
  constructor(
    @Inject(AUTH_SUBJECT_EXISTENCE_READER)
    private readonly subjects: AuthSubjectExistenceReader,
  ) {}
  exists(subjectId: string): Promise<boolean> {
    return this.subjects.exists(subjectId);
  }
}
