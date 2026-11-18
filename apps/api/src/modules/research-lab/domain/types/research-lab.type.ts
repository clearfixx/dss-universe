/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Research Lab
 * 📄 File: apps/api/src/modules/research-lab/domain/types/research-lab.type.ts
 *
 * 🎯 Purpose:
 * Defines the framework-neutral lifecycle vocabulary for Research Lab.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export type ResearchPageKind =
  | 'WIKI'
  | 'MANUAL'
  | 'RESEARCH'
  | 'GUIDE'
  | 'CASE_STUDY'
  | 'NOTE'
  | 'REPORT';

export type ResearchPageState = 'DRAFT' | 'ACTIVE' | 'ARCHIVED' | 'TOMBSTONED';

export type ResearchRevisionState =
  | 'IN_REVIEW'
  | 'CHANGES_REQUESTED'
  | 'REJECTED'
  | 'PUBLISHED'
  | 'SUPERSEDED'
  | 'WITHDRAWN';

export type ResearchReviewAction =
  | 'SUBMITTED'
  | 'CHANGES_REQUESTED'
  | 'REJECTED'
  | 'PUBLISHED'
  | 'WITHDRAWN'
  | 'ROLLED_BACK'
  | 'RESTORED';

export type ResearchProtectionLevel =
  | 'OPEN'
  | 'TRUSTED'
  | 'GUARDIAN_ONLY'
  | 'LOCKED';

export type ResearchVisibility = 'PUBLIC' | 'MEMBERS' | 'GROUPS';

export type ResearchViewerFacts = Readonly<{
  authenticated: boolean;
  groups: readonly string[];
  premium: boolean;
  guardian: boolean;
}>;
