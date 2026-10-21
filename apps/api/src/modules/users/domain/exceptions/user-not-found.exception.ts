/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/domain/exceptions/user-not-found.exception.ts
 *
 * 🎯 Purpose:
 * Represents the error thrown when the requested user does not exist.
 *
 * 🧠 Responsibilities:
 * • provides a reusable "user not found" exception;
 * • centralizes the error used across the Users module;
 * • keeps user lookup failures consistent.
 *
 * 🏗️ Architecture:
 * Domain exception.
 * Currently implemented using NestJS exception types.
 *
 * ⚠️ Important:
 * This implementation is temporary.
 * A future architecture phase may replace framework-specific exceptions
 * with framework-agnostic domain errors.
 *
 * 💡 Notes:
 * 🚧 Architecture evolves.
 * Good boundaries are improved deliberately, not impulsively.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { NotFoundException } from '@nestjs/common';

import { USER_ERRORS } from '../constants/user-errors.constant';

export class UserNotFoundException extends NotFoundException {
  constructor() {
    super(USER_ERRORS.NOT_FOUND);
  }
}

/**
 * -----------------------------------------------------------------------------
 * Today this is a Nest exception.
 * Tomorrow it may become a pure Domain Error.
 * -----------------------------------------------------------------------------
 */
