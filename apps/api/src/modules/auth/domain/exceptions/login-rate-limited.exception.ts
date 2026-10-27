/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/domain/exceptions/login-rate-limited.exception.ts
 * 🎯 Purpose: Identifies temporary login denial without choosing a transport.
 * 🧠 Responsibilities: preserves the stable owner failure identity and message.
 * 🏗️ Architecture: Private framework-independent Auth domain error.
 * ⚠️ Important: Does not decide limits, mutate counters or expose lock details.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export class LoginRateLimitedException extends Error {
  constructor() {
    super('Login is temporarily unavailable. Please try again later.');
    this.name = LoginRateLimitedException.name;
  }
}
