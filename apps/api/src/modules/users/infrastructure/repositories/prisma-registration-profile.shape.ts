/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/infrastructure/repositories/prisma-registration-profile.shape.ts
 *
 * 🎯 Purpose:
 * Copies only Users-owned enrollment fields without retaining the caller's profile.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export function registrationProfileData(
  profile: Readonly<{ username: string; displayName?: string }>,
) {
  return { username: profile.username, displayName: profile.displayName };
}
