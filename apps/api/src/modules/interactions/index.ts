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
export { BookmarksService } from './application/services/bookmarks.service';
export { CommentDraftsService } from './application/services/comment-drafts.service';
export { InteractionTargetsService } from './application/services/interaction-targets.service';
export { CommentsService } from './application/services/comments.service';
export { ReactionsService } from './application/services/reactions.service';
export { AudienceEngagementService } from './application/services/audience-engagement.service';
export { ModerationService } from './application/services/moderation.service';
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
