/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Reputation
 * 📄 File: apps/api/src/modules/reputation/domain/types/reputation-qualification.type.ts
 * 🎯 Purpose: Describes owned producer evidence without consumer or persistence types.
 * 🧠 Responsibilities: Keeps original lifecycle and event contribution coordinates explicit.
 * 🏗️ Architecture: Versioned read data; no framework, Prisma or sibling domain imports.
 * ⚠️ Important: A view is evidence, not root attestation or delivery authorization.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export type ReputationQualificationEvent = {
  eventId: string;
  entryId: string;
  kind: 'DIRECT' | 'REVERSAL';
  actorId: string;
  recipientId: string;
  value: -1 | 1;
  originalEntryId: string | null;
  occurredAt: string;
  provenance: 'NATIVE' | 'VERIFIED_LEGACY' | 'BLOCKED_LEGACY';
  contractVersion: 1;
};
export type ReputationProducerFact = {
  evidence: ReputationQualificationEvent;
  factId: string;
  eventId: string;
  scope: 'ENTRY' | 'EVENT';
  sourceId: string;
  revision: '1' | '2';
  action: 'QUALIFY' | 'WITHDRAW';
  qualification: { factId: string; eventId: string };
  contractVersion: 1;
};
export type ReputationQualificationView = {
  event: ReputationQualificationEvent;
  facts: readonly ReputationProducerFact[];
  contributionFactId: string;
  blocked: boolean;
};
