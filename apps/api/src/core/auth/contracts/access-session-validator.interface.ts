/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Core Authentication
 * 📄 File: apps/api/src/core/auth/contracts/access-session-validator.interface.ts
 *
 * 🎯 Purpose:
 * Defines the consumer-owned capability for authoritative access-session validation.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type { AccessSessionClaim } from '../types/access-session-claim.type';

export interface AccessSessionValidator {
  isActive(claim: AccessSessionClaim): Promise<boolean>;
}

export const ACCESS_SESSION_VALIDATOR = Symbol('ACCESS_SESSION_VALIDATOR');
