/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Levels
 * 📄 File: apps/api/src/modules/levels/levels.module.ts
 *
 * 🎯 Purpose:
 * Wires the Community Points-derived Levels bounded context.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Module } from '@nestjs/common';

import { AuditModule } from '@api/core/audit';
import { PrismaModule } from '@api/core/database';
import { EventsModule } from '@api/core/events';
import { CommunityPointsModule } from '@api/modules/community-points';
import { UsersModule } from '@api/modules/users';

import { LevelsService } from './application/services/levels.service';
import { LEVELS_REPOSITORY } from './domain/repositories/levels.repository.interface';
import { PrismaLevelsRepository } from './infrastructure/repositories/prisma-levels.repository';
import { LevelsResolver } from './presentation/graphql/resolvers/levels.resolver';

@Module({
  imports: [
    PrismaModule,
    AuditModule,
    EventsModule,
    UsersModule,
    CommunityPointsModule,
  ],
  providers: [
    LevelsService,
    LevelsResolver,
    {
      provide: LEVELS_REPOSITORY,
      useClass: PrismaLevelsRepository,
    },
  ],
  exports: [LevelsService],
})
export class LevelsModule {}

/**
 * Levels dock downstream of Community Points. No duplicated fuel tanks.
 */
