/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Moderation
 * 📄 File: apps/api/src/modules/moderation/domain/account-ban.rules.ts
 *
 * 🎯 Purpose:
 * The human-readable reference number of a permanent ban.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export function banReference(at: Date, random: Uint8Array): string {
  const suffix = Array.from(random, (byte) =>
    byte.toString(16).padStart(2, '0'),
  )
    .join('')
    .toUpperCase();
  return `BAN-${at.toISOString().slice(0, 10)}-${suffix}`;
}
