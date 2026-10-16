/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: IAM Access Groups
 * 📄 File: apps/api/src/modules/iam/infrastructure/repositories/prisma-membership-grant.writer.ts
 *
 * 🎯 Purpose:
 * Persists owned membership grants with atomic audit and root-bound subject existence.
 *
 * 🧠 Responsibilities:
 * • locks and checks the group before any subject lookup;
 * • preserves membership projection and attributable audit payload.
 *
 * 🏗️ Architecture:
 * Stateless IAM writer; subject callback stays entirely inside infrastructure.
 *
 * ⚠️ Important:
 * No transaction lifetime, Auth SQL, eligibility filter or new outbox step.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Injectable } from '@nestjs/common';
import { AuditWriterService } from '@api/core/audit';
import type { TransactionClient } from '@api/core/database';
import type {
  GrantAccessMembership,
  MembershipRecord,
} from '../../access-groups/domain/access-group.types';
import { membershipSelect } from './access-membership.shape';
@Injectable()
export class PrismaMembershipGrantWriter {
  constructor(private readonly audit: AuditWriterService) {}
  async grant(
    tx: TransactionClient,
    input: GrantAccessMembership,
    actorId: string,
    subjectExists: () => Promise<boolean>,
  ): Promise<MembershipRecord | null> {
    await tx.$queryRaw`SELECT id FROM access_groups WHERE id = ${input.groupId} FOR UPDATE`;
    const group = await tx.accessGroup.findUnique({
      where: { id: input.groupId },
      select: { enabled: true },
    });
    if (!group?.enabled) return null;
    if (!(await subjectExists())) return null;
    const record = await tx.accessGroupMembership.create({
      data: {
        groupId: input.groupId,
        subjectId: input.subjectId,
        validFrom: input.validFrom,
        validUntil: input.validUntil,
        grantedById: actorId,
      },
      select: membershipSelect,
    });
    await this.audit.append(tx, {
      action: 'iam.access-membership.granted',
      actorType: 'USER',
      actorId,
      targetType: 'AccessGroupMembership',
      targetId: record.id,
      metadata: {
        subjectId: record.subjectId,
        groupId: record.groupId,
        validFrom: record.validFrom.toISOString(),
        validUntil: record.validUntil?.toISOString() ?? null,
      },
    });
    return record;
  }
}
