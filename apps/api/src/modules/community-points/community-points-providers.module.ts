/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Community Points
 * 📄 File: apps/api/src/modules/community-points/community-points-providers.module.ts
 *
 * 🎯 Purpose:
 * Shares one private service/repository graph across API and runtime assemblies.
 *
 * 🧠 Responsibilities:
 * • owns exactly one service and repository registration;
 * • makes provider lifetimes reusable without presentation.
 *
 * 🏗️ Architecture:
 * Private owner assembly; not exported from the public module index.
 *
 * ⚠️ Important:
 * Only owner wrappers consume these private exports; no automatic processing starts here.
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
import { PrismaCommunityPointsRepository } from './infrastructure/repositories/prisma-community-points.repository';
export const COMMUNITY_POINTS_INTERNAL_BALANCE_READER = Symbol(
  'COMMUNITY_POINTS_INTERNAL_BALANCE_READER',
);

@Module({
  imports: [PrismaModule, AuditModule, EventsModule],
  providers: [
    CommunityPointsService,
    {
      provide: COMMUNITY_POINTS_REPOSITORY,
      useClass: PrismaCommunityPointsRepository,
    },
    {
      provide: COMMUNITY_POINTS_INTERNAL_BALANCE_READER,
      inject: [COMMUNITY_POINTS_REPOSITORY],
      useFactory: (repository: CommunityPointsRepository) =>
        Object.freeze({
          balance: (subjectId: string) => repository.balance(subjectId),
        }),
    },
  ],
  exports: [CommunityPointsService, COMMUNITY_POINTS_INTERNAL_BALANCE_READER],
})
export class CommunityPointsProvidersModule {}
