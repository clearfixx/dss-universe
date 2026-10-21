/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Content Access
 * 📄 File: apps/api/src/modules/content-access/domain/types/content-gate.type.ts
 *
 * 🎯 Purpose:
 * Defines gate audience constraints, numeric thresholds and evaluation results.
 * GROUP is mandatory audience membership; ALL/ANY applies to numeric thresholds.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type { ContentGateRequirementKind } from '../../contracts/content-gate-decisions.contract';
export {
  CONTENT_GATE_REQUIREMENT_KINDS,
  type ContentGateRequirementKind,
} from '../../contracts/content-gate-decisions.contract';

export const CONTENT_GATE_OPERATORS = ['ALL', 'ANY'] as const;
export type ContentGateOperator = (typeof CONTENT_GATE_OPERATORS)[number];

export type ContentGateRequirement = {
  id: string;
  kind: ContentGateRequirementKind;
  threshold: number | null;
  groupKey: string | null;
};

export type ContentGate = {
  id: string;
  ownerId: string;
  operator: ContentGateOperator;
  requirements: ContentGateRequirement[];
  createdAt: Date;
  updatedAt: Date;
};

export type CreateContentGate = {
  ownerId: string;
  operator: ContentGateOperator;
  requirements: Array<Omit<ContentGateRequirement, 'id'>>;
};

export type ContentGateViewerFacts = {
  accountAgeDays: number;
  comments: number;
  forumPosts: number;
  publications: number;
  reputation: number;
  groups: string[];
};

export type ContentGateEvaluation = {
  gate: ContentGate;
  allowed: boolean;
  bypassed: boolean;
  unmet: ContentGateRequirementKind[];
  notice: string;
};

/** Gates describe access. Protected content remains with its owning module. */
