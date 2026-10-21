/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/domain/constants/user-errors.constant.ts
 *
 * 🎯 Purpose:
 * Defines reusable error messages for the Users domain.
 *
 * 🧠 Responsibilities:
 * • centralizes user-related error messages;
 * • avoids duplicated string literals across the module;
 * • provides a single source of truth for user domain errors.
 *
 * 🏗️ Architecture:
 * Domain constants.
 * Shared across domain, application, and infrastructure when appropriate.
 *
 * ⚠️ Important:
 * Keep messages stable and descriptive.
 * Business meaning belongs here, formatting belongs elsewhere.
 *
 * 💡 Notes:
 * 📚 One message.
 * One meaning.
 * One place.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export const USER_ERRORS = {
  NOT_FOUND: 'User not found',
  EMAIL_ALREADY_EXISTS: 'User with this email already exists',
} as const;

/**
 * -----------------------------------------------------------------------------
 * Error messages should have a single home.
 * Duplication is the first step toward inconsistency.
 * -----------------------------------------------------------------------------
 */
