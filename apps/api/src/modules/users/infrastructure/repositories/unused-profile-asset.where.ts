/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users Persistence
 * 📄 File: apps/api/src/modules/users/infrastructure/repositories/unused-profile-asset.where.ts
 *
 * 🎯 Purpose:
 * Publishes only profile-binding absence for guarded root query composition.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { Prisma } from '@prisma/client';

export function unusedProfileAssetWhere(): Pick<
  Prisma.MediaWhereInput,
  'avatarFor' | 'coverFor'
> {
  return { avatarFor: null, coverFor: null };
}
