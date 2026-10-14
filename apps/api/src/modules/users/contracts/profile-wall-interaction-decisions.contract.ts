/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/contracts/profile-wall-interaction-decisions.contract.ts
 *
 * 🎯 Purpose:
 * Publishes only Profile Wall owner-coordinate, block and privacy decisions.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export type ProfileWallInteractionRequest = Readonly<{
  postId: string;
  interactionTargetId: string;
  viewerId: string;
}>;
export type ProfileWallInteractionDecision = Readonly<{
  allowed: boolean;
  reason?: string;
}>;
export interface ProfileWallInteractionDecisions {
  authorize(
    request: ProfileWallInteractionRequest,
  ): Promise<ProfileWallInteractionDecision>;
}
export const PROFILE_WALL_INTERACTION_DECISIONS = Symbol(
  'PROFILE_WALL_INTERACTION_DECISIONS',
);
