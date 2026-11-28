/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Forum (Community Hub)
 * 📄 File: apps/api/src/modules/forum/forum.module.ts
 *
 * 🎯 Purpose:
 * Establishes the Community Hub owner boundary with its CH-0 structure.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Module } from '@nestjs/common';
import { AuthorizationModule } from '@api/core/authorization';
import { EditorModule } from '@api/modules/editor';
import { InteractionsModule } from '@api/modules/interactions';
import { ModerationModule } from '@api/modules/moderation';
import { FORUM_SEARCH_SOURCE } from './contracts/forum-search-source.contract';
import { PrismaForumSearch } from './infrastructure/prisma-forum-search';
import { ForumIntegrationsService } from './infrastructure/prisma-forum-integrations';
import { ForumIntegrationsResolver } from './presentation/forum-integrations.resolver';
import { ForumOperationsService } from './infrastructure/prisma-forum-operations';
import { ForumOperationsResolver } from './presentation/forum-operations.resolver';
import { ForumCurationService } from './infrastructure/prisma-forum-curation';
import { ForumCurationResolver } from './presentation/forum-curation.resolver';
import { FORUM_INTERACTION_DECISIONS } from './contracts/forum-interaction-decisions.contract';
import { ForumTopicsService } from './infrastructure/prisma-forum-topics';
import {
  ForumPostMediaResolver,
  ForumTopicsResolver,
} from './presentation/forum-topics.resolver';
import { ForumModerationService } from './infrastructure/prisma-forum-moderation';
import { ForumModerationResolver } from './presentation/forum-moderation.resolver';
import { ForumPostNetworkService } from './infrastructure/prisma-forum-post-network';
import { ForumPostNetworkResolver } from './presentation/forum-post-network.resolver';
import { ForumRatingsService } from './infrastructure/prisma-forum-ratings';
import { ForumRatingsResolver } from './presentation/forum-ratings.resolver';
import {
  ForumModeratorCardResolver,
  ForumCategoryModeratorsResolver,
  ForumPostReadResolver,
  ForumPostRevisionReadResolver,
  ForumPostVoteReadResolver,
  ForumModerationActionReadResolver,
  ForumStatsResolver,
  ForumSubforumStatsResolver,
  ForumTopicReadResolver,
} from './presentation/forum-read-models.resolver';
import { PrismaForumReadModels } from './infrastructure/prisma-forum-read-models';
import { ForumMemberStatsResolver } from './presentation/forum-member-stats.resolver';
import { FORUM_VIEWER_FACTS } from './contracts/forum-viewer-facts.contract';
import { ForumViewerFactsAdapter } from './infrastructure/forum-viewer-facts.adapter';
import { ForumStructureService } from './infrastructure/prisma-forum-structure';
import { ForumStructureResolver } from './presentation/forum-structure.resolver';

import {
  ForumAutoCloseRunner,
  ForumAutoCloseService,
} from './infrastructure/forum-auto-close.service';
@Module({
  imports: [
    AuthorizationModule,
    EditorModule,
    InteractionsModule,
    ModerationModule,
  ],
  providers: [
    ForumViewerFactsAdapter,
    { provide: FORUM_VIEWER_FACTS, useExisting: ForumViewerFactsAdapter },
    ForumStructureService,
    ForumStructureResolver,
    ForumTopicsService,
    ForumTopicsResolver,
    ForumPostMediaResolver,
    ForumModerationService,
    ForumModerationResolver,
    ForumPostNetworkService,
    ForumPostNetworkResolver,
    ForumRatingsService,
    ForumRatingsResolver,
    PrismaForumReadModels,
    ForumTopicReadResolver,
    ForumModeratorCardResolver,
    ForumCategoryModeratorsResolver,
    ForumPostReadResolver,
    ForumPostRevisionReadResolver,
    ForumPostVoteReadResolver,
    ForumModerationActionReadResolver,
    ForumStatsResolver,
    ForumSubforumStatsResolver,
    ForumMemberStatsResolver,
    ForumCurationService,
    ForumCurationResolver,
    ForumOperationsService,
    ForumOperationsResolver,
    ForumIntegrationsService,
    ForumIntegrationsResolver,
    ForumAutoCloseService,
    ForumAutoCloseRunner,
    { provide: FORUM_SEARCH_SOURCE, useClass: PrismaForumSearch },
    { provide: FORUM_INTERACTION_DECISIONS, useExisting: ForumTopicsService },
  ],
  exports: [FORUM_INTERACTION_DECISIONS, FORUM_SEARCH_SOURCE],
})
export class ForumModule {}
