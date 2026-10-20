/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Interaction Platform
 * 📄 File: apps/api/src/modules/interactions/domain/types/interaction-viewer.type.ts
 *
 * 🎯 Purpose:
 * Distinguishes a guest from a verified opaque subject without carrying credentials or profiles.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export type InteractionViewer =
  | Readonly<{ kind: 'GUEST' }>
  | Readonly<{ kind: 'AUTHENTICATED'; subjectId: string }>;
