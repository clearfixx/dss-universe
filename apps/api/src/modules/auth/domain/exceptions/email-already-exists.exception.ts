/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/domain/exceptions/email-already-exists.exception.ts
 *
 * 🎯 Purpose:
 * Defines the domain exception thrown when a registration email is already used.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { ConflictException } from '@nestjs/common';

import { AUTH_ERRORS } from '../constants/auth-errors.constant';

export class EmailAlreadyExistsException extends ConflictException {
  constructor() {
    super(AUTH_ERRORS.EMAIL_ALREADY_EXISTS);
  }
}
