/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Interaction Platform
 * 📄 File: apps/api/src/modules/interactions/interactions.module.ts
 *
 * 🎯 Purpose:
 * Wires the canonical interaction target registry and policy boundary.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Module } from '@nestjs/common';

import { AuditModule } from '@api/core/audit';
import { PrismaModule } from '@api/core/database';
import { EventsModule } from '@api/core/events';

import { EditorModule } from '../editor';

import { BookmarksService } from './application/services/bookmarks.service';
import { CommentDraftsService } from './application/services/comment-drafts.service';
import { CommentInteractionPolicy } from './application/services/comment-interaction.policy';
import { CommentsService } from './application/services/comments.service';
import { InteractionPolicyRegistryService } from './application/services/interaction-policy-registry.service';
import { InteractionTargetWriterService } from './application/services/interaction-target-writer.service';
import { InteractionTargetsService } from './application/services/interaction-targets.service';
import { ModerationService } from './application/services/moderation.service';
import { ReactionsService } from './application/services/reactions.service';
import { AudienceEngagementService } from './application/services/audience-engagement.service';
import { AUDIENCE_ENGAGEMENT_REPOSITORY } from './domain/repositories/audience-engagement.repository.interface';
import { BOOKMARKS_REPOSITORY } from './domain/repositories/bookmarks.repository.interface';
import { COMMENT_DRAFTS_REPOSITORY } from './domain/repositories/comment-drafts.repository.interface';
import { COMMENTS_REPOSITORY } from './domain/repositories/comments.repository.interface';
import { INTERACTION_TARGETS_REPOSITORY } from './domain/repositories/interaction-targets.repository.interface';
import { REACTIONS_REPOSITORY } from './domain/repositories/reactions.repository.interface';
import { MODERATION_REPOSITORY } from './domain/repositories/moderation.repository.interface';
import { PrismaBookmarksRepository } from './infrastructure/repositories/prisma-bookmarks.repository';
import { PrismaCommentDraftsRepository } from './infrastructure/repositories/prisma-comment-drafts.repository';
import { PrismaCommentsRepository } from './infrastructure/repositories/prisma-comments.repository';
import { PrismaInteractionTargetsRepository } from './infrastructure/repositories/prisma-interaction-targets.repository';
import { PrismaModerationRepository } from './infrastructure/repositories/prisma-moderation.repository';
import { PrismaReactionsRepository } from './infrastructure/repositories/prisma-reactions.repository';
import { PrismaAudienceEngagementRepository } from './infrastructure/repositories/prisma-audience-engagement.repository';
import { AudienceEngagementResolver } from './presentation/graphql/resolvers/audience-engagement.resolver';
import { BookmarksResolver } from './presentation/graphql/resolvers/bookmarks.resolver';
import { CommentDraftsResolver } from './presentation/graphql/resolvers/comment-drafts.resolver';
import { CommentsResolver } from './presentation/graphql/resolvers/comments.resolver';
import { InteractionTargetsResolver } from './presentation/graphql/resolvers/interaction-targets.resolver';
import { ModerationResolver } from './presentation/graphql/resolvers/moderation.resolver';
import { ReactionsResolver } from './presentation/graphql/resolvers/reactions.resolver';

@Module({
  imports: [PrismaModule, AuditModule, EventsModule, EditorModule],
  providers: [
    InteractionPolicyRegistryService,
    InteractionTargetWriterService,
    InteractionTargetsService,
    InteractionTargetsResolver,
    BookmarksService,
    BookmarksResolver,
    CommentDraftsService,
    CommentInteractionPolicy,
    CommentDraftsResolver,
    CommentsService,
    CommentsResolver,
    ReactionsService,
    ReactionsResolver,
    AudienceEngagementService,
    AudienceEngagementResolver,
    ModerationService,
    ModerationResolver,
    {
      provide: AUDIENCE_ENGAGEMENT_REPOSITORY,
      useClass: PrismaAudienceEngagementRepository,
    },
    {
      provide: BOOKMARKS_REPOSITORY,
      useClass: PrismaBookmarksRepository,
    },
    {
      provide: INTERACTION_TARGETS_REPOSITORY,
      useClass: PrismaInteractionTargetsRepository,
    },
    {
      provide: COMMENTS_REPOSITORY,
      useClass: PrismaCommentsRepository,
    },
    {
      provide: COMMENT_DRAFTS_REPOSITORY,
      useClass: PrismaCommentDraftsRepository,
    },
    {
      provide: REACTIONS_REPOSITORY,
      useClass: PrismaReactionsRepository,
    },
    {
      provide: MODERATION_REPOSITORY,
      useClass: PrismaModerationRepository,
    },
  ],
  exports: [
    InteractionPolicyRegistryService,
    InteractionTargetWriterService,
    InteractionTargetsService,
    BookmarksService,
    CommentDraftsService,
    CommentsService,
    ReactionsService,
    AudienceEngagementService,
    ModerationService,
  ],
})
export class InteractionsModule {}

/**
 * One registry, many worlds, zero polymorphic-FK folklore.
 */
