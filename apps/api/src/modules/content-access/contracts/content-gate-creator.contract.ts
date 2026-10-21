/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Content Access
 * 📄 File: apps/api/src/modules/content-access/contracts/content-gate-creator.contract.ts
 *
 * 🎯 Purpose:
 * Publishes bounded policy creation without exposing evaluation scopes or repositories.
 *
 * 🏗️ Architecture:
 * Named owner capability; no foreign service, ORM or transport dependency.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type {
  ContentGatePolicyCreation,
  ContentGatePolicyView,
} from './content-gate-policy-view.type';
export const CONTENT_GATE_CREATOR = Symbol('CONTENT_GATE_CREATOR');
export interface ContentGateCreator {
  create(input: ContentGatePolicyCreation): Promise<ContentGatePolicyView>;
}
