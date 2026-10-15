/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Interaction Persistence Composition
 * 📄 File: apps/api/src/modules/interactions/infrastructure.ts
 *
 * 🎯 Purpose:
 * Publishes owned technical persistence adapters only for guarded root transaction composition.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
// Not a business API. Feature consumers and application layers may not import this entry.
export { PrismaInteractionTargetWriter } from './infrastructure/repositories/prisma-interaction-target.writer';
export {
  PrismaCommentWriter,
  type CommentRecipientResolver,
} from './infrastructure/repositories/prisma-comment.writer';
export {
  PrismaInteractionDeliveryReader,
  type InteractionDeliveryComment,
} from './infrastructure/repositories/prisma-interaction-delivery.reader';
