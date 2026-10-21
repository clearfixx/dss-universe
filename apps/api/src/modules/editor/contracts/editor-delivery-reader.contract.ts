/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: DSS Editor Platform
 * 📄 File: apps/api/src/modules/editor/contracts/editor-delivery-reader.contract.ts
 *
 * 🎯 Purpose:
 * Publishes viewer-safe delivery JSON and decisions without internal documents.
 *
 * 🏗️ Architecture:
 * Named owner capability; no foreign service, ORM or transport dependency.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export const EDITOR_DELIVERY_READER = Symbol('EDITOR_DELIVERY_READER');
export type EditorDeliveryDecision = Readonly<{
  gateId: string;
  allowed: boolean;
  bypassed: boolean;
  unmet: readonly (
    | 'ACCOUNT_AGE_DAYS'
    | 'COMMENTS'
    | 'FORUM_POSTS'
    | 'PUBLICATIONS'
    | 'REPUTATION'
    | 'GROUP'
  )[];
  notice: string;
}>;
export type EditorDeliveryView = Readonly<{
  documentJson: string;
  gates: readonly EditorDeliveryDecision[];
}>;
export interface EditorDeliveryReader {
  project(documentJson: string, viewerId: string): Promise<EditorDeliveryView>;
}
