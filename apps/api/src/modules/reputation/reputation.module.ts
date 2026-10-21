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

import { ReputationService } from './application/services/reputation.service';
import { REPUTATION_TOTAL_READER } from './contracts/reputation-total-reader.contract';
import { PrismaReputationTotalReader } from './infrastructure/repositories/prisma-reputation-total.reader';
import { REPUTATION_REPOSITORY } from './domain/repositories/reputation.repository.interface';
import { PrismaReputationRepository } from './infrastructure/repositories/prisma-reputation.repository';
import { ReputationResolver } from './presentation/graphql/resolvers/reputation.resolver';

@Module({
  imports: [PrismaModule, AuditModule, EventsModule],
  providers: [
    { provide: REPUTATION_TOTAL_READER, useClass: PrismaReputationTotalReader },
    ReputationService,
    ReputationResolver,
    {
      provide: REPUTATION_REPOSITORY,
      useClass: PrismaReputationRepository,
    },
  ],
  exports: [REPUTATION_TOTAL_READER],
})
export class ReputationModule {}

/**
 * Reputation docks beside Users; it does not move into their cabin.
 */
