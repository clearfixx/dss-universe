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
import {
  ReputationModule,
  REPUTATION_ACCOUNT_READER,
  REPUTATION_BLOCK_READER,
  REPUTATION_PROFILE_EXISTENCE,
} from '@api/modules/reputation';
import { ReputationAccountAdapter } from './infrastructure/reputation-account.adapter';
import { ReputationBlockAdapter } from './infrastructure/reputation-block.adapter';
import { ReputationProfileAdapter } from './infrastructure/reputation-profile.adapter';
@Global()
@Module({
  imports: [AuthModule, UsersModule, ReputationModule],
  providers: [
    { provide: REPUTATION_ACCOUNT_READER, useClass: ReputationAccountAdapter },
    { provide: REPUTATION_BLOCK_READER, useClass: ReputationBlockAdapter },
    {
      provide: REPUTATION_PROFILE_EXISTENCE,
      useClass: ReputationProfileAdapter,
    },
  ],
  exports: [
    REPUTATION_ACCOUNT_READER,
    REPUTATION_BLOCK_READER,
    REPUTATION_PROFILE_EXISTENCE,
  ],
})
export class ReputationIntegrationModule {}
