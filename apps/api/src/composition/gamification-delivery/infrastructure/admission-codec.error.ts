/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Gamification Delivery Codec
 * 📄 File: apps/api/src/composition/gamification-delivery/infrastructure/admission-codec.error.ts
 * 🎯 Purpose: Identifies controlled seal validation failures without input disclosure.
 * 🧠 Responsibilities: Separates malformed/oversize projections from unknown failures.
 * 🏗️ Architecture: Local Error, no HTTP or framework mapping.
 * ⚠️ Important: Never attach the rejected projection to this error.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export class AdmissionCodecError extends Error {
  constructor(
    readonly code: 'INVALID_QUALIFIED_PROJECTION' | 'PROJECTION_TOO_LARGE',
  ) {
    super(code);
    this.name = 'AdmissionCodecError';
  }
}
