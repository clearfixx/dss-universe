/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/domain/contracts/create-user.contract.ts
 *
 * 🎯 Purpose:
 * Defines the domain contract required to create a user.
 *
 * 🧠 Responsibilities:
 * • describes user creation data accepted by the Users repository;
 * • keeps creation input independent from HTTP DTOs;
 * • prevents infrastructure-specific types from leaking into domain contracts.
 *
 * 🏗️ Architecture:
 * Domain contract.
 * Used by repository boundaries and application services.
 *
 * ⚠️ Important:
 * This contract is not a request DTO.
 * HTTP, GraphQL, CLI, and seed inputs should map into this shape before reaching the domain boundary.
 *
 * 💡 Notes:
 * 📝 Contract is a boundary.
 * If it changes, every caller should understand why.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export type CreateUserContract = {
  email: string;
  username: string;
  passwordHash: string;
  displayName?: string | null;
};

/**
 * -----------------------------------------------------------------------------
 * User creation starts here, but transport details stay outside.
 * -----------------------------------------------------------------------------
 */
