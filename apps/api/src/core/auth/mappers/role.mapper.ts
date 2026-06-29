/**
 * DSS File Passport 🛰️
 * File: apps/api/src/core/auth/mappers/role.mapper.ts
 * Purpose: Normalizes role names for auth checks.
 * Phase: 2.4.5 — RBAC Core Migration
 * Architecture: Compatibility mapper
 *
 * Notes:
 * - Old enum-based roles are gone.
 * - This mapper now only normalizes DB role names.
 */

export class RoleMapper {
  static toCore(roleName: string): string {
    return roleName.trim().toLowerCase();
  }

  static manyToCore(roleNames: string[]): string[] {
    return roleNames.map((roleName) => this.toCore(roleName));
  }
}
