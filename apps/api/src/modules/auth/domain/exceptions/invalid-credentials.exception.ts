/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/domain/exceptions/invalid-credentials.exception.ts
 *
 * 🎯 Purpose:
 * Defines the domain exception thrown when authentication credentials are invalid.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { UnauthorizedException } from '@nestjs/common';

import { AUTH_ERRORS } from '../constants/auth-errors.constant';

export class InvalidCredentialsException extends UnauthorizedException {
  constructor() {
    super(AUTH_ERRORS.INVALID_CREDENTIALS);
  }
}
