/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Reputation Composition
 * 📄 File: apps/api/src/composition/reputation/reputation-integration.module.ts
 *
 * 🎯 Purpose:
 * Wires separate evidence owners into Reputation without foreign service injection.
 *
 * 🧠 Responsibilities:
 * • adapts Auth account evidence and Users safety/existence facts;
 * • binds independently owned Reputation input ports;
 * • keeps feature applications unaware of sibling implementations.
 * • binds default-isolation ledger display reads to guarded owner persistence adapters.
 *
 * 🏗️ Architecture:
 * Root composition wiring; no scoring or authentication business rules.
 *
 * ⚠️ Important:
 * No default-allow adapter, profile aggregate or repository may cross these ports.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Global, Module } from '@nestjs/common';
import { AuthModule } from '@api/modules/auth';
import { UsersModule } from '@api/modules/users';
import { PrismaModule } from '@api/core/database';
import { AuditModule } from '@api/core/audit';
import { EventsModule } from '@api/core/events';
import {
  PrismaReputationActorReader,
  PrismaReputationWriteActorReader,
} from '@api/modules/users/infrastructure';
import {
  PrismaReputationEntryReader,
  PrismaReputationWriter,
} from '@api/modules/reputation/infrastructure';
import {
  ReputationModule,
  REPUTATION_ACCOUNT_READER,
  REPUTATION_BLOCK_READER,
  REPUTATION_PROFILE_EXISTENCE,
  REPUTATION_ENTRY_READER,
  REPUTATION_WRITE_TRANSACTION,
} from '@api/modules/reputation';
import { ReputationAccountAdapter } from './infrastructure/reputation-account.adapter';
import { ReputationBlockAdapter } from './infrastructure/reputation-block.adapter';
import { ReputationProfileAdapter } from './infrastructure/reputation-profile.adapter';
import { PrismaReputationReadUnit } from './infrastructure/prisma-reputation.read-unit';
import { PrismaReputationWriteTransaction } from './infrastructure/prisma-reputation-write.transaction';
@Global()
@Module({
  imports: [
    PrismaModule,
    AuditModule,
    EventsModule,
    AuthModule,
    UsersModule,
    ReputationModule,
  ],
  providers: [
    PrismaReputationEntryReader,
    PrismaReputationActorReader,
    PrismaReputationWriteActorReader,
    PrismaReputationWriter,
    {
      provide: REPUTATION_WRITE_TRANSACTION,
      useClass: PrismaReputationWriteTransaction,
    },
    { provide: REPUTATION_ENTRY_READER, useClass: PrismaReputationReadUnit },
    { provide: REPUTATION_ACCOUNT_READER, useClass: ReputationAccountAdapter },
    { provide: REPUTATION_BLOCK_READER, useClass: ReputationBlockAdapter },
    {
      provide: REPUTATION_PROFILE_EXISTENCE,
      useClass: ReputationProfileAdapter,
    },
  ],
  exports: [
    REPUTATION_WRITE_TRANSACTION,
    REPUTATION_ENTRY_READER,
    REPUTATION_ACCOUNT_READER,
    REPUTATION_BLOCK_READER,
    REPUTATION_PROFILE_EXISTENCE,
  ],
})
export class ReputationIntegrationModule {}
