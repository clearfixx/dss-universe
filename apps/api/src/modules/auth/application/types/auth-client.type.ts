/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/application/types/auth-client.type.ts
 *
 * 🎯 Purpose:
 * Carries bounded client metadata into session creation.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export type AuthClient = {
  userAgent?: string;
  ipAddress?: string;
};

/**
 * 🕵️ Store enough to recognize a device, never enough to become creepy.
 */
