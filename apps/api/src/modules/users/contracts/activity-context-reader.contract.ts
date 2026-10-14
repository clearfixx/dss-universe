/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/contracts/activity-context-reader.contract.ts
 *
 * 🎯 Purpose:
 * Publishes only viewer interests, followed IDs and bidirectional blocked IDs for activity personalization.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export const USER_ACTIVITY_CONTEXT_READER = Symbol(
  'USER_ACTIVITY_CONTEXT_READER',
);
export type UserActivityContext = Readonly<{
  interests: readonly string[];
  followingIds: readonly string[];
  blockedIds: readonly string[];
}>;
export interface UserActivityContextReader {
  readForViewer(viewerId: string): Promise<UserActivityContext>;
}
