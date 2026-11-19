/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Research Lab
 * 📄 File: apps/api/src/modules/research-lab/contracts/research-lab-authority.contract.ts
 *
 * 🎯 Purpose:
 * Declares the consumer-owned authorization evidence required by Research Lab.
 *
 * ⚠️ Important:
 * Guardian is review authority only and must never imply audience access.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { ResearchViewerFacts } from '../domain/types/research-lab.type';

export interface ResearchLabAuthorityDecisions {
  canModerate(subjectId: string, at: Date): Promise<boolean>;
  viewerFacts(subjectId: string | null, at: Date): Promise<ResearchViewerFacts>;
}

export const RESEARCH_LAB_AUTHORITY_DECISIONS = Symbol(
  'RESEARCH_LAB_AUTHORITY_DECISIONS',
);
