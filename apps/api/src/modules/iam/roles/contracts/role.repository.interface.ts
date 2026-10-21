/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: IAM Roles
 * 📄 File: apps/api/src/modules/iam/roles/contracts/role.repository.interface.ts
 *
 * 🎯 Purpose:
 * Defines private role persistence without exposing ORM records or transactions.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { RoleWithPermissions } from '../types/role-with-permissions.type';

export type RoleRecord = Omit<RoleWithPermissions, 'permissions'>;
export interface RoleRepository {
  findIdByName(name: string): Promise<string | null>;
  findRecordById(id: string): Promise<RoleRecord | null>;
  findById(id: string): Promise<RoleWithPermissions | null>;
  findAll(): Promise<RoleWithPermissions[]>;
  create(
    input: Readonly<{
      name: string;
      label: string;
      description?: string;
      permissionIds?: readonly string[];
    }>,
  ): Promise<RoleWithPermissions>;
  update(
    id: string,
    input: Readonly<{ name?: string; label?: string; description?: string }>,
  ): Promise<RoleWithPermissions>;
  remove(id: string): Promise<void>;
  permissionExists(id: string): Promise<boolean>;
  countPermissions(ids: readonly string[]): Promise<number>;
  hasPermission(roleId: string, permissionId: string): Promise<boolean>;
  assignPermission(roleId: string, permissionId: string): Promise<void>;
  revokePermission(roleId: string, permissionId: string): Promise<void>;
}
export const IAM_ROLE_REPOSITORY = Symbol('IAM_ROLE_REPOSITORY');
