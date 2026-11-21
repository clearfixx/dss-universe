/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Content Access
 * 📄 File: apps/api/src/modules/content-access/domain/ports/gate-viewer-restriction.interface.ts
 *
 * 🎯 Purpose:
 * Consumer-owned port for the viewer's current read-only sanction fact.
 *
 * ⚠️ Important:
 * A read-only viewer cannot unlock hidden content, including Premium bypass.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export const GATE_VIEWER_RESTRICTION = Symbol('GATE_VIEWER_RESTRICTION');
export interface GateViewerRestrictionReader {
  isReadOnly(subjectId: string, at: Date): Promise<boolean>;
}
