/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Research Lab
 * 📄 File: apps/api/src/modules/research-lab/domain/errors/research-lab-transition.error.ts
 *
 * 🎯 Purpose:
 * Reports invalid owner-local lifecycle transitions without transport coupling.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export class ResearchLabTransitionError extends Error {
  constructor(
    readonly aggregate: 'page' | 'revision',
    readonly from: string,
    readonly to: string,
  ) {
    super(`Invalid Research Lab ${aggregate} transition: ${from} -> ${to}.`);
    this.name = 'ResearchLabTransitionError';
  }
}
