/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/domain/exceptions/two-factor-required.exception.ts
 *
 * 🎯 Purpose:
 * Identifies missing or invalid second-factor proof without transport coupling.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export class TwoFactorRequiredException extends Error {
  constructor() {
    super('A valid two-factor or recovery code is required.');
    this.name = TwoFactorRequiredException.name;
  }
}
