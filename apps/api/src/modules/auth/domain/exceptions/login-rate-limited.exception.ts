/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/domain/exceptions/login-rate-limited.exception.ts
 * 🎯 Purpose: Preserves the public temporary-login-denial transport envelope.
 * 🧠 Responsibilities: carries stable message and explicit status for REST/Apollo.
 * 🏗️ Architecture: Inherited Nest-coupled exception; DEBT-079 decoupling remains open.
 * ⚠️ Important: Does not decide limits, mutate counters or expose lock details.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { HttpException, HttpStatus } from '@nestjs/common';

export class LoginRateLimitedException extends HttpException {
  constructor() {
    super(
      {
        message: 'Login is temporarily unavailable. Please try again later.',
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
