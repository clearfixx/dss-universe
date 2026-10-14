/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Interaction Platform
 * 📄 File: apps/api/src/modules/interactions/contracts/interaction-policy-registrations.contract.ts
 *
 * 🎯 Purpose:
 * Publishes policy registration with minimal requests instead of the concrete registry.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export type InteractionPolicyCapability =
  | 'READ'
  | 'COMMENT'
  | 'REACT'
  | 'BOOKMARK'
  | 'SHARE';
export type InteractionPolicyRequest = Readonly<{
  targetId: string;
  ownerId: string;
  actorId: string;
  capability: InteractionPolicyCapability;
}>;
export type InteractionPolicyVerdict = Readonly<{
  allowed: boolean;
  reason?: string;
}>;
export interface RegisteredInteractionPolicy {
  readonly kind: string;
  authorize(
    request: InteractionPolicyRequest,
  ): Promise<InteractionPolicyVerdict>;
}
export interface InteractionPolicyRegistrations {
  register(policy: RegisteredInteractionPolicy): void;
  unregister(policy: RegisteredInteractionPolicy): void;
}
export const INTERACTION_POLICY_REGISTRATIONS = Symbol(
  'INTERACTION_POLICY_REGISTRATIONS',
);
