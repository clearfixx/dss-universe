/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Content Access
 * 📄 File: apps/api/src/modules/content-access/domain/repositories/content-gates.repository.interface.ts
 *
 * 🎯 Purpose:
 * Defines owned gate-definition persistence without foreign viewer statistics.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type {
  ContentGate,
  CreateContentGate,
} from '../types/content-gate.type';

export const CONTENT_GATES_REPOSITORY = Symbol('CONTENT_GATES_REPOSITORY');

export interface ContentGatesRepository {
  create(input: CreateContentGate): Promise<ContentGate>;
  findById(id: string): Promise<ContentGate | null>;
}

/** Gate definitions stay here; external evidence enters application-owned ports. */
