/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Reputation
 * 📄 File: apps/api/src/modules/reputation/reputation.module.ts
 *
 * 🎯 Purpose:
 * Wires the direct Reputation Ledger bounded context.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Module } from '@nestjs/common';

import { AuditModule } from '@api/core/audit';
import { PrismaModule } from '@api/core/database';
import { EventsModule } from '@api/core/events';
import { UsersModule } from '@api/modules/users';

import { ReputationService } from './application/services/reputation.service';
import { REPUTATION_REPOSITORY } from './domain/repositories/reputation.repository.interface';
import { PrismaReputationRepository } from './infrastructure/repositories/prisma-reputation.repository';
import { ReputationResolver } from './presentation/graphql/resolvers/reputation.resolver';

@Module({
  imports: [PrismaModule, AuditModule, EventsModule, UsersModule],
  providers: [
    ReputationService,
    ReputationResolver,
    {
      provide: REPUTATION_REPOSITORY,
      useClass: PrismaReputationRepository,
    },
  ],
  exports: [ReputationService],
})
export class ReputationModule {}

/**
 * Reputation docks beside Users; it does not move into their cabin.
 */
