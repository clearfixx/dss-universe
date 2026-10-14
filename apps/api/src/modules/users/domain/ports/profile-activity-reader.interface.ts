/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/domain/ports/profile-activity-reader.interface.ts
 *
 * 🎯 Purpose:
 * Defines the minimal projected activity consumed after Users privacy/block checks.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { PaginatedResult } from '@api/shared';
export type ProfileActivityItem = Readonly<{
  id: string;
  actorId: string;
  module: string;
  action: string;
  subjectType: string;
  subjectId: string;
  occurredAt: Date;
}>;
export interface ProfileActivityReader {
  byActor(
    actorId: string,
    page?: number,
    limit?: number,
  ): Promise<PaginatedResult<ProfileActivityItem>>;
}
export const PROFILE_ACTIVITY_READER = Symbol('PROFILE_ACTIVITY_READER');
