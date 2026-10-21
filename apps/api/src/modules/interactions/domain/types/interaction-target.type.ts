/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Interaction Platform
 * 📄 File: apps/api/src/modules/interactions/domain/types/interaction-target.type.ts
 *
 * 🎯 Purpose:
 * Defines canonical interaction identity, lifecycle, and owner decisions.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type { InteractionViewer } from './interaction-viewer.type';

export type InteractionTargetStatus = 'ACTIVE' | 'LOCKED' | 'RETIRED';

export type InteractionCapability =
  | 'READ'
  | 'COMMENT'
  | 'REACT'
  | 'BOOKMARK'
  | 'SHARE';

export type InteractionTarget = {
  id: string;
  kind: string;
  ownerModule: string;
  ownerType: string;
  ownerId: string;
  status: InteractionTargetStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type RegisterInteractionTarget = Pick<
  InteractionTarget,
  'id' | 'kind' | 'ownerModule' | 'ownerType' | 'ownerId'
> & {
  actorId?: string;
};

export type InteractionAccessDecision = {
  target: InteractionTarget;
  capability: InteractionCapability;
  allowed: boolean;
  reason: string | null;
};

export interface InteractionTargetPolicy {
  readonly kind: string;
  authorize(
    target: InteractionTarget,
    viewer: InteractionViewer,
    capability: InteractionCapability,
  ): Promise<{ allowed: boolean; reason?: string }>;
}

/**
 * Shared modules receive target ids. Owner coordinates never become fake FKs.
 */
