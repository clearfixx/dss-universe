/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Custom Titles
 * 📄 File: apps/api/src/modules/custom-titles/infrastructure/repositories/title-grant.shape.ts
 *
 * 🎯 Purpose:
 * Preserves the owned title/selection projection and public grant mapping across write paths.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { Prisma } from '@prisma/client';
import type { UserTitleGrant } from '../../domain/types/custom-titles.type';

export const grantInclude = {
  title: true,
  selection: { select: { userId: true } },
} as const;
export type GrantRow = Prisma.UserTitleGrantGetPayload<{
  include: typeof grantInclude;
}>;
export function toTitleGrant(record: GrantRow): UserTitleGrant {
  return {
    id: record.id,
    userId: record.userId,
    titleId: record.titleId,
    grantedById: record.grantedById,
    grantReason: record.grantReason,
    grantedAt: record.grantedAt,
    revokedAt: record.revokedAt,
    revokedById: record.revokedById,
    revokeReason: record.revokeReason,
    title: record.title,
    selected: Boolean(record.selection),
  };
}
