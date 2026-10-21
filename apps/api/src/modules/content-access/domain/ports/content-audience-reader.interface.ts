/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Content Access
 * 📄 File: apps/api/src/modules/content-access/domain/ports/content-audience-reader.interface.ts
 *
 * 🎯 Purpose:
 * Requires authoritative audience and Premium facts independently of numeric statistics.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export interface ContentAudienceReader {
  read(
    subjectId: string,
    at: Date,
  ): Promise<Readonly<{ groups: readonly string[]; premium: boolean }> | null>;
}
export const CONTENT_AUDIENCE_READER = Symbol('CONTENT_AUDIENCE_READER');
