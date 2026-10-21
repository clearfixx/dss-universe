/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Access Group Composition
 * 📄 File: apps/api/src/composition/access-groups/infrastructure/group-management.adapter.ts
 *
 * 🎯 Purpose:
 * Adapts current Authorization management decisions into the IAM-owned command port.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Inject, Injectable } from '@nestjs/common';
import {
  ACCESS_CAPABILITY_DECISIONS,
  type AccessCapabilityDecisions,
} from '@api/core/authorization';
import type { GroupManagementAuthority } from '@api/modules/iam';
@Injectable()
export class GroupManagementAdapter implements GroupManagementAuthority {
  constructor(
    @Inject(ACCESS_CAPABILITY_DECISIONS)
    private readonly decisions: AccessCapabilityDecisions,
  ) {}
  canManage(subjectId: string): Promise<boolean> {
    return this.decisions.canManageGroups(subjectId);
  }
}
