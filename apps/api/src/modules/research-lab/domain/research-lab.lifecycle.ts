/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Research Lab
 * 📄 File: apps/api/src/modules/research-lab/domain/research-lab.lifecycle.ts
 *
 * 🎯 Purpose:
 * Defines the closed page and immutable-revision state machines.
 *
 * ⚠️ Important:
 * Rollback creates another revision; it never moves a historical revision back.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { ResearchLabTransitionError } from './errors/research-lab-transition.error';
import type {
  ResearchPageState,
  ResearchRevisionState,
} from './types/research-lab.type';

const PAGE_TRANSITIONS: Readonly<
  Record<ResearchPageState, readonly ResearchPageState[]>
> = {
  DRAFT: ['ACTIVE', 'TOMBSTONED'],
  ACTIVE: ['ARCHIVED', 'TOMBSTONED'],
  ARCHIVED: ['ACTIVE', 'TOMBSTONED'],
  TOMBSTONED: ['ACTIVE'],
};

const REVISION_TRANSITIONS: Readonly<
  Record<ResearchRevisionState, readonly ResearchRevisionState[]>
> = {
  IN_REVIEW: ['CHANGES_REQUESTED', 'REJECTED', 'PUBLISHED', 'WITHDRAWN'],
  CHANGES_REQUESTED: [],
  REJECTED: [],
  PUBLISHED: ['SUPERSEDED'],
  SUPERSEDED: [],
  WITHDRAWN: [],
};

export function assertResearchPageTransition(
  from: ResearchPageState,
  to: ResearchPageState,
  hasPublishedRevision: boolean,
): void {
  if (
    !PAGE_TRANSITIONS[from].includes(to) ||
    (to === 'ACTIVE' && !hasPublishedRevision)
  ) {
    throw new ResearchLabTransitionError('page', from, to);
  }
}

export function assertResearchRevisionTransition(
  from: ResearchRevisionState,
  to: ResearchRevisionState,
): void {
  if (!REVISION_TRANSITIONS[from].includes(to)) {
    throw new ResearchLabTransitionError('revision', from, to);
  }
}
