/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/domain/types/profile-completion.type.ts
 *
 * 🎯 Purpose:
 * Defines the deterministic owner-facing profile completion result.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export const PROFILE_COMPLETION_FIELDS = [
  'AVATAR',
  'COVER',
  'BIO',
  'LOCATION',
  'WEBSITE',
  'TECHNOLOGIES',
  'INTERESTS',
  'SOCIAL_LINKS',
] as const;

export type ProfileCompletionField = (typeof PROFILE_COMPLETION_FIELDS)[number];

export interface ProfileCompletion {
  percentage: number;
  completedCount: number;
  totalCount: number;
  isComplete: boolean;
  completedFields: ProfileCompletionField[];
  missingFields: ProfileCompletionField[];
}

/**
 * Completion is a live checklist, not another stale column waiting to happen.
 */
