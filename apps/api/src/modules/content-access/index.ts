/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Content Access
 * 📄 File: apps/api/src/modules/content-access/index.ts
 *
 * 🎯 Purpose:
 * Exposes minimal gate verdicts and owner-specific audience inputs by name.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export { ContentAccessModule } from './content-access.module';
export {
  CONTENT_GATE_DECISIONS,
  type ContentGateDecisions,
  type ContentGateDecision,
  type ContentGateRequirementKind,
} from './contracts/content-gate-decisions.contract';
export {
  CONTENT_AUDIENCE_READER,
  type ContentAudienceReader,
} from './domain/ports/content-audience-reader.interface';

/** One public hatch keeps gate internals out of neighboring modules. */
