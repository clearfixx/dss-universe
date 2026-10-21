/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/domain/constants/auth-errors.constant.ts
 *
 * 🎯 Purpose:
 * Defines stable authentication error messages used by domain exceptions.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export const AUTH_ERRORS = {
  INVALID_CREDENTIALS: 'Invalid email or password',
  EMAIL_ALREADY_EXISTS: 'User with this email already exists',
} as const;
