/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Moderation
 * 📄 File: apps/api/src/modules/moderation/application/moderation-sanctions.commands.ts
 *
 * 🎯 Purpose:
 * Declares transport-neutral sanction command and query inputs.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { ModerationSanctionPolicy } from '../domain/types/moderation-sanction.type';

export type ModerationActor = {
  id: string;
  permissions: readonly string[];
};

export type SanctionContextInput = {
  type?: string | null;
  id?: string | null;
  path?: string | null;
} | null;

export type IssueWarningCommand = {
  subjectId: string;
  reason: string;
  context: SanctionContextInput;
};

export type IssueReadOnlyCommand = IssueWarningCommand & {
  expiresAt: Date;
};

export type RevokeSanctionCommand = {
  sanctionId: string;
  reason: string;
};

export type UpdateSanctionPolicyCommand = ModerationSanctionPolicy;
