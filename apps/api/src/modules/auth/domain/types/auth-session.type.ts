/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/domain/types/auth-session.type.ts
 *
 * 🎯 Purpose:
 * Defines the transport-neutral authenticated session contract.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export type AuthSession = {
  id: string;
  userId: string;
  tokenHash: string;
  userAgent: string | null;
  ipAddress: string | null;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateAuthSession = {
  id: string;
  userId: string;
  tokenHash: string;
  userAgent?: string;
  ipAddress?: string;
  expiresAt: Date;
};

/**
 * 🔄 Sessions remember devices; refresh tokens remain secret.
 */
