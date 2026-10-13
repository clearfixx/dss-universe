/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: IAM Permissions
 * 📄 File: apps/api/src/modules/iam/permissions/contracts/permission.repository.interface.ts
 *
 * 🎯 Purpose:
 * Defines private permission persistence operations without exposing transactions.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { PermissionRecord } from '../types/permission-record.type';

export interface PermissionRepository {
  findIdByKey(key: string): Promise<string | null>;
  findAll(): Promise<PermissionRecord[]>;
  findById(id: string): Promise<PermissionRecord | null>;
  createWithAudit(
    input: Readonly<{ key: string; label: string; description?: string }>,
    actorId?: string,
  ): Promise<PermissionRecord>;
  update(
    id: string,
    input: Readonly<{ key?: string; label?: string; description?: string }>,
  ): Promise<PermissionRecord>;
  remove(id: string): Promise<void>;
}

export const IAM_PERMISSION_REPOSITORY = Symbol('IAM_PERMISSION_REPOSITORY');
