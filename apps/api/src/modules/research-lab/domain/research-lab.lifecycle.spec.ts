/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Research Lab Tests
 * 📄 File: apps/api/src/modules/research-lab/domain/research-lab.lifecycle.spec.ts
 *
 * 🎯 Purpose:
 * Characterizes the closed page and immutable-revision lifecycle.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { ResearchLabTransitionError } from './errors/research-lab-transition.error';
import {
  assertResearchPageTransition,
  assertResearchRevisionTransition,
} from './research-lab.lifecycle';

describe('Research Lab lifecycle', () => {
  it.each([
    ['DRAFT', 'ACTIVE'],
    ['ACTIVE', 'ARCHIVED'],
    ['ARCHIVED', 'ACTIVE'],
    ['ACTIVE', 'TOMBSTONED'],
    ['TOMBSTONED', 'ACTIVE'],
  ] as const)('allows page transition %s -> %s', (from, to) => {
    expect(() => assertResearchPageTransition(from, to, true)).not.toThrow();
  });

  it('does not expose a page as active without a published revision', () => {
    expect(() =>
      assertResearchPageTransition('DRAFT', 'ACTIVE', false),
    ).toThrow(ResearchLabTransitionError);
  });

  it.each([
    ['DRAFT', 'ARCHIVED'],
    ['ARCHIVED', 'DRAFT'],
    ['TOMBSTONED', 'DRAFT'],
  ] as const)('rejects page transition %s -> %s', (from, to) => {
    expect(() => assertResearchPageTransition(from, to, true)).toThrow(
      ResearchLabTransitionError,
    );
  });

  it.each([
    ['IN_REVIEW', 'CHANGES_REQUESTED'],
    ['IN_REVIEW', 'REJECTED'],
    ['IN_REVIEW', 'PUBLISHED'],
    ['IN_REVIEW', 'WITHDRAWN'],
    ['PUBLISHED', 'SUPERSEDED'],
  ] as const)('allows revision transition %s -> %s', (from, to) => {
    expect(() => assertResearchRevisionTransition(from, to)).not.toThrow();
  });

  it.each([
    ['REJECTED', 'PUBLISHED'],
    ['SUPERSEDED', 'PUBLISHED'],
    ['CHANGES_REQUESTED', 'IN_REVIEW'],
    ['WITHDRAWN', 'IN_REVIEW'],
  ] as const)('keeps terminal revision %s from moving to %s', (from, to) => {
    expect(() => assertResearchRevisionTransition(from, to)).toThrow(
      ResearchLabTransitionError,
    );
  });
});
