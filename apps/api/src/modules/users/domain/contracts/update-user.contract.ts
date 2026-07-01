/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/domain/contracts/update-user.contract.ts
 *
 * 🎯 Purpose:
 * Defines the domain contract required to update user data.
 *
 * 🧠 Responsibilities:
 * • describes mutable user fields accepted by the Users repository;
 * • keeps update input independent from transport-specific DTOs;
 * • prevents infrastructure-specific update shapes from leaking into domain contracts.
 *
 * 🏗️ Architecture:
 * Domain contract.
 * Used by repository boundaries and application services.
 *
 * ⚠️ Important:
 * This contract should only contain fields that are safe to update through domain-level operations.
 *
 * 💡 Notes:
 * 📝 Contract is a boundary.
 * Do not turn it into a Prisma update input.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export type UpdateUserContract = {
  email?: string;
  username?: string;
  displayName?: string | null;
  passwordHash?: string;
};

/**
 * -----------------------------------------------------------------------------
 * Update contracts describe intent.
 * Persistence adapters decide how that intent reaches storage.
 * -----------------------------------------------------------------------------
 */
