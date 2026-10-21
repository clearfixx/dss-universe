/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/application/services/access-session-validation.service.ts
 *
 * 🎯 Purpose:
 * Evaluates current session eligibility for an opaque authentication subject.
 *
 * 🧠 Responsibilities:
 * • rejects missing or malformed session evidence;
 * • checks current ownership, expiry, revocation and account access version.
 *
 * 🏗️ Architecture:
 * Authentication application capability implementing the Core Auth consumer port.
 * Persistence remains behind the Auth-owned repository.
 *
 * ⚠️ Important:
 * Every validation reads authoritative state; cached JWT claims cannot override denial.
 * Repository failures propagate without creating an authenticated principal.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Inject, Injectable } from '@nestjs/common';

import type {
  AccessSessionClaim,
  AccessSessionValidator,
} from '@api/core/auth';

import {
  ACCESS_SESSION_REPOSITORY,
  type AccessSessionRepository,
} from '../../domain/repositories/access-session.repository.interface';

@Injectable()
export class AccessSessionValidationService implements AccessSessionValidator {
  constructor(
    @Inject(ACCESS_SESSION_REPOSITORY)
    private readonly repository: AccessSessionRepository,
  ) {}

  async isActive(claim: AccessSessionClaim): Promise<boolean> {
    if (
      typeof claim.subjectId !== 'string' ||
      !claim.subjectId ||
      typeof claim.sessionId !== 'string' ||
      !claim.sessionId ||
      !Number.isInteger(claim.authVersion) ||
      claim.authVersion < 0
    )
      return false;

    const session = await this.repository.findById(claim.sessionId);
    return Boolean(
      session &&
      session.subjectId === claim.subjectId &&
      session.revokedAt === null &&
      session.expiresAt.getTime() > Date.now() &&
      session.accountActive &&
      session.authVersion === claim.authVersion,
    );
  }
}
