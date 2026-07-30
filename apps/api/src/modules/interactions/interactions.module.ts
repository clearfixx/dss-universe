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

import { BookmarksService } from './application/services/bookmarks.service';
import { CommentsService } from './application/services/comments.service';
import { InteractionPolicyRegistryService } from './application/services/interaction-policy-registry.service';
import { InteractionTargetWriterService } from './application/services/interaction-target-writer.service';
import { InteractionTargetsService } from './application/services/interaction-targets.service';
import { ReactionsService } from './application/services/reactions.service';
import { BOOKMARKS_REPOSITORY } from './domain/repositories/bookmarks.repository.interface';
import { COMMENTS_REPOSITORY } from './domain/repositories/comments.repository.interface';
import { INTERACTION_TARGETS_REPOSITORY } from './domain/repositories/interaction-targets.repository.interface';
import { REACTIONS_REPOSITORY } from './domain/repositories/reactions.repository.interface';
import { PrismaBookmarksRepository } from './infrastructure/repositories/prisma-bookmarks.repository';
import { PrismaCommentsRepository } from './infrastructure/repositories/prisma-comments.repository';
import { PrismaInteractionTargetsRepository } from './infrastructure/repositories/prisma-interaction-targets.repository';
import { PrismaReactionsRepository } from './infrastructure/repositories/prisma-reactions.repository';
import { BookmarksResolver } from './presentation/graphql/resolvers/bookmarks.resolver';
import { CommentsResolver } from './presentation/graphql/resolvers/comments.resolver';
import { InteractionTargetsResolver } from './presentation/graphql/resolvers/interaction-targets.resolver';
import { ReactionsResolver } from './presentation/graphql/resolvers/reactions.resolver';

@Module({
  imports: [PrismaModule, AuditModule, EventsModule],
  providers: [
    InteractionPolicyRegistryService,
    InteractionTargetWriterService,
    InteractionTargetsService,
    InteractionTargetsResolver,
    BookmarksService,
    BookmarksResolver,
    CommentsService,
    CommentsResolver,
    ReactionsService,
    ReactionsResolver,
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
      provide: REACTIONS_REPOSITORY,
      useClass: PrismaReactionsRepository,
    },
  ],
  exports: [
    InteractionPolicyRegistryService,
    InteractionTargetWriterService,
    InteractionTargetsService,
    BookmarksService,
    CommentsService,
    ReactionsService,
  ],
})
export class InteractionsModule {}

/**
 * One registry, many worlds, zero polymorphic-FK folklore.
 */
