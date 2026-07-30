/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Interaction Platform
 * 📄 File: apps/api/src/modules/interactions/index.ts
 *
 * 🎯 Purpose:
 * Exposes the public integration surface of the Interaction Platform.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export { InteractionsModule } from './interactions.module';
export { InteractionPolicyRegistryService } from './application/services/interaction-policy-registry.service';
export { InteractionTargetWriterService } from './application/services/interaction-target-writer.service';
export { InteractionTargetsService } from './application/services/interaction-targets.service';
export { CommentsService } from './application/services/comments.service';
export { ReactionsService } from './application/services/reactions.service';
export type {
  InteractionCapability,
  InteractionTarget,
  InteractionTargetPolicy,
} from './domain/types/interaction-target.type';

/**
 * Public barrels are airlocks: export only what another module truly needs.
 */
