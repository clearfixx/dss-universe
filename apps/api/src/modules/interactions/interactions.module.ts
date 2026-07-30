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

import { InteractionPolicyRegistryService } from './application/services/interaction-policy-registry.service';
import { InteractionTargetWriterService } from './application/services/interaction-target-writer.service';
import { InteractionTargetsService } from './application/services/interaction-targets.service';
import { INTERACTION_TARGETS_REPOSITORY } from './domain/repositories/interaction-targets.repository.interface';
import { PrismaInteractionTargetsRepository } from './infrastructure/repositories/prisma-interaction-targets.repository';
import { InteractionTargetsResolver } from './presentation/graphql/resolvers/interaction-targets.resolver';
import { CommentsService } from './application/services/comments.service';
import { COMMENTS_REPOSITORY } from './domain/repositories/comments.repository.interface';
import { PrismaCommentsRepository } from './infrastructure/repositories/prisma-comments.repository';
import { CommentsResolver } from './presentation/graphql/resolvers/comments.resolver';

@Module({
  imports: [PrismaModule, AuditModule, EventsModule],
  providers: [
    InteractionPolicyRegistryService,
    InteractionTargetWriterService,
    InteractionTargetsService,
    InteractionTargetsResolver,
    CommentsService,
    CommentsResolver,
    {
      provide: INTERACTION_TARGETS_REPOSITORY,
      useClass: PrismaInteractionTargetsRepository,
    },
    {
      provide: COMMENTS_REPOSITORY,
      useClass: PrismaCommentsRepository,
    },
  ],
  exports: [
    InteractionPolicyRegistryService,
    InteractionTargetWriterService,
    InteractionTargetsService,
    CommentsService,
  ],
})
export class InteractionsModule {}

/**
 * One registry, many worlds, zero polymorphic-FK folklore.
 */
