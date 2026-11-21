/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Moderation
 * 📄 File: apps/api/src/modules/moderation/contracts/sanction-issuer.contract.ts
 *
 * 🎯 Purpose:
 * Lets owner modules issue sanctions after their own scope decisions.
 *
 * ⚠️ Important:
 * The caller must have already verified the actor's scope (for example a
 * Forum curator's topic). Moderation still enforces self-sanction, staff
 * protection, policy bounds and escalation.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { ModerationSanctionKind } from '../domain/types/moderation-sanction.type';

export type ScopedSanctionCommand = {
  actorId: string;
  subjectId: string;
  kind: ModerationSanctionKind;
  reason: string;
  context: { type: string; id: string; path?: string | null };
  readOnlyUntil?: Date | null;
};

export type IssuedSanctionReceipt = {
  sanctionId: string;
  escalatedSanctionId: string | null;
};

export interface SanctionIssuer {
  issueScoped(command: ScopedSanctionCommand): Promise<IssuedSanctionReceipt>;
}

export const SANCTION_ISSUER = Symbol('SANCTION_ISSUER');
