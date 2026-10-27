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
 * Framework-independent owner failure; presentation chooses its transport.
 *
 * ⚠️ Important:
 * Keep HTTP statuses and Nest exceptions in Users presentation.
 *
 * 💡 Notes:
 * 🚧 Architecture evolves.
 * Good boundaries are improved deliberately, not impulsively.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { USER_ERRORS } from '../constants/user-errors.constant';

export class UserNotFoundException extends Error {
  constructor() {
    super(USER_ERRORS.NOT_FOUND);
    this.name = UserNotFoundException.name;
  }
}

/**
 * -----------------------------------------------------------------------------
 * The profile may be missing; its transport passport belongs at the airlock.
 * -----------------------------------------------------------------------------
 */
