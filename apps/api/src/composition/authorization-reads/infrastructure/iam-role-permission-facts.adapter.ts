/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authorization Read Composition
 * 📄 File: apps/api/src/composition/authorization-reads/infrastructure/iam-role-permission-facts.adapter.ts
 *
 * 🎯 Purpose:
 * Binds the Authorization role-facts input to a narrow published IAM reader.
 *
 * 🏗️ Architecture:
 * Owned fact boundary; root infrastructure assembles cross-owner persistence.
 *
 * ⚠️ Important:
 * Preserve current query schedule and first-seen order; no ACTIVE policy, cache or fallback on failure.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Inject, Injectable } from '@nestjs/common';
import {
  IAM_ROLE_PERMISSION_KEYS_READER,
  type IamRolePermissionKeysReader,
} from '@api/modules/iam';
import type { AuthorizationRolePermissionFacts } from '@api/core/authorization';
@Injectable()
export class IamRolePermissionFactsAdapter implements AuthorizationRolePermissionFacts {
  constructor(
    @Inject(IAM_ROLE_PERMISSION_KEYS_READER)
    private readonly keys: IamRolePermissionKeysReader,
  ) {}
  read(roleNames: string[]): Promise<string[]> {
    return this.keys.read(roleNames);
  }
}
