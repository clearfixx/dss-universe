/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Community Points
 * 📄 File: apps/api/src/modules/community-points/community-points.module.ts
 *
 * 🎯 Purpose:
 * Wires the event-derived Community Points bounded context.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Module } from '@nestjs/common';

import { AuditModule } from '@api/core/audit';
import { PrismaModule } from '@api/core/database';
import { EventsModule } from '@api/core/events';
import { UsersModule } from '@api/modules/users';

import { CommunityPointsService } from './application/services/community-points.service';
import { COMMUNITY_POINTS_REPOSITORY } from './domain/repositories/community-points.repository.interface';
import { PrismaCommunityPointsRepository } from './infrastructure/repositories/prisma-community-points.repository';
import { CommunityPointsResolver } from './presentation/graphql/resolvers/community-points.resolver';

@Module({
  imports: [PrismaModule, AuditModule, EventsModule, UsersModule],
  providers: [
    CommunityPointsService,
    CommunityPointsResolver,
    {
      provide: COMMUNITY_POINTS_REPOSITORY,
      useClass: PrismaCommunityPointsRepository,
    },
  ],
  exports: [CommunityPointsService],
})
export class CommunityPointsModule {}

/**
 * Community Points observes the Universe; feature modules keep their autonomy.
 */
