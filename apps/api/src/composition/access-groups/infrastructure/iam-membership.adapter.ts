/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Access Group Composition
 * 📄 File: apps/api/src/composition/access-groups/infrastructure/iam-membership.adapter.ts
 *
 * 🎯 Purpose:
 * Translates published IAM membership facts into Authorization-owned evidence.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Inject, Injectable } from '@nestjs/common';
import {
  IAM_ACCESS_MEMBERSHIPS,
  type IamAccessMembershipReader,
} from '@api/modules/iam';
import type { AccessMembershipsReader } from '@api/core/authorization';
@Injectable()
export class IamMembershipAdapter implements AccessMembershipsReader {
  constructor(
    @Inject(IAM_ACCESS_MEMBERSHIPS)
    private readonly source: IamAccessMembershipReader,
  ) {}
  async read(subjectId: string, at: Date) {
    return (await this.source.readEffective(subjectId, at)).map((group) => ({
      key: group.key,
      premium: group.kind === 'PREMIUM',
      capabilities: [...group.capabilities],
    }));
  }
}
