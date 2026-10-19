/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Interaction Platform
 * 📄 File: apps/api/src/modules/interactions/index.ts
 *
 * 🎯 Purpose:
 * Exposes named interaction contracts and projections, not internal application services.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export { InteractionsModule } from './interactions.module';
export {
  COMMENT_WRITE_TRANSACTION,
  type CommentWriteTransaction,
} from './contracts/comment-write-transaction.port';
export type {
  CreateComment,
  EditCommentContent,
} from './domain/types/comment.type';
export {
  COMMENT_COUNT_READER,
  type CommentCountReader,
} from './contracts/comment-count-reader.contract';
export type {
  InteractionCapability,
  InteractionTarget,
} from './domain/types/interaction-target.type';
export type {
  AudienceEngagementResult,
  ShareChannel,
  ShareChannelCount,
} from './domain/types/audience-engagement.type';

/**
 * Public barrels are airlocks: export only what another module truly needs.
 */
export {
  COMMENT_DOCUMENT_NORMALIZER,
  type CommentDocumentNormalizer,
  type CommentDocumentProjection,
} from './domain/ports/comment-document-normalizer.interface';
export {
  INTERACTION_POLICY_REGISTRATIONS,
  type InteractionPolicyRegistrations,
  type RegisteredInteractionPolicy,
  type InteractionPolicyRequest,
  type InteractionPolicyVerdict,
  type InteractionPolicyCapability,
} from './contracts/interaction-policy-registrations.contract';
