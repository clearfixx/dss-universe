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

import { CommunityPointsService } from './application/services/community-points.service';
import {
  COMMUNITY_POINTS_REPOSITORY,
  type CommunityPointsRepository,
} from './domain/repositories/community-points.repository.interface';
import { COMMUNITY_POINTS_BALANCE_READER } from './contracts/balance-reader.contract';
import { PrismaCommunityPointsRepository } from './infrastructure/repositories/prisma-community-points.repository';
import { CommunityPointsResolver } from './presentation/graphql/resolvers/community-points.resolver';

@Module({
  imports: [PrismaModule, AuditModule, EventsModule],
  providers: [
    {
      provide: COMMUNITY_POINTS_BALANCE_READER,
      inject: [COMMUNITY_POINTS_REPOSITORY],
      useFactory: (repository: CommunityPointsRepository) =>
        Object.freeze({
          balance: (subjectId: string) => repository.balance(subjectId),
        }),
    },
    CommunityPointsService,
    CommunityPointsResolver,
    {
      provide: COMMUNITY_POINTS_REPOSITORY,
      useClass: PrismaCommunityPointsRepository,
    },
  ],
  exports: [COMMUNITY_POINTS_BALANCE_READER],
})
export class CommunityPointsModule {}

/**
 * Community Points observes the Universe; feature modules keep their autonomy.
 */
