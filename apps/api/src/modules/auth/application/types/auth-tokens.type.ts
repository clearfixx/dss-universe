/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/application/types/auth-tokens.type.ts
 *
 * 🎯 Purpose:
 * Defines the authentication response shape returned after token issuing.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type { SafeUser } from '../../../users/domain/types/safe-user.type';

export interface AuthTokens {
  user: SafeUser;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}
