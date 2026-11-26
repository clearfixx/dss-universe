/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Moderation
 * 📄 File: apps/web/src/features/moderation/sanctions-model.ts
 *
 * 🎯 Purpose:
 * Pure helpers of the sanctions journal (P1 B09): Ukrainian labels for
 * kinds and origins and the display status of one sanction.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type {
  ModerationSanctionKind,
  ModerationSanctionOrigin,
} from "@/gql/graphql";

export const SANCTION_KIND_LABEL: Record<ModerationSanctionKind, string> = {
  WARNING: "Попередження",
  READ_ONLY: "Лише читання",
};

export const SANCTION_ORIGIN_LABEL: Record<ModerationSanctionOrigin, string> = {
  MANUAL: "Вручну",
  ESCALATION: "Автоматично (накопичення попереджень)",
  SCOPED: "З модерації допису",
};

export type SanctionStatus = "active" | "revoked" | "consumed" | "expired";

export const SANCTION_STATUS_LABEL: Record<SanctionStatus, string> = {
  active: "Діє",
  revoked: "Скасовано",
  consumed: "Переведено в «Лише читання»",
  expired: "Завершилося",
};

/**
 * Revoked wins over everything; a warning that triggered an escalation is
 * "consumed"; otherwise active until it expires.
 */
export function sanctionStatus(
  sanction: Readonly<{
    active: boolean;
    revokedAt?: unknown;
    consumedAt?: unknown;
  }>,
): SanctionStatus {
  if (sanction.revokedAt) return "revoked";
  if (sanction.consumedAt) return "consumed";
  return sanction.active ? "active" : "expired";
}

export function sanctionKind(value: unknown): ModerationSanctionKind | null {
  return value === "WARNING" || value === "READ_ONLY" ? value : null;
}
