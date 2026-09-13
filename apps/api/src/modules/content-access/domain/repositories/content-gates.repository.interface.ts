/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Content Access
 * 📄 File: apps/api/src/modules/content-access/domain/repositories/content-gates.repository.interface.ts
 *
 * 🎯 Purpose:
 * Defines persistence and fact-projection boundaries for Content Gates.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type {
  ContentGate,
  ContentGateViewerFacts,
  CreateContentGate,
} from '../types/content-gate.type';

export const CONTENT_GATES_REPOSITORY = Symbol('CONTENT_GATES_REPOSITORY');

export interface ContentGatesRepository {
  create(input: CreateContentGate): Promise<ContentGate>;
  findById(id: string): Promise<ContentGate | null>;
  viewerFacts(
    userId: string,
    now: Date,
  ): Promise<ContentGateViewerFacts | null>;
}

/** The repository counts evidence; policy meaning stays in the domain service. */
