/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Reputation Qualification Read Composition
 * 📄 File: apps/api/src/composition/reputation/reputation-qualification-read.module.ts
 * 🎯 Purpose: Shares one read-only qualification assembly between API and headless persistence.
 * 🧠 Responsibilities: Binds canonical/producer readers without importing feature applications.
 * 🏗️ Architecture: Root infrastructure assembly; exports only the preparation adapter.
 * ⚠️ Important: The host supplies configuration; this module starts no work.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Module } from '@nestjs/common';
import { PrismaModule } from '@api/core/database';
import { EventsModule } from '@api/core/events';
import { PrismaReputationQualificationReader } from '@api/modules/reputation/infrastructure';
import { ReputationQualificationAdapter } from './infrastructure/reputation-qualification.adapter';

@Module({
  imports: [PrismaModule, EventsModule],
  providers: [
    PrismaReputationQualificationReader,
    ReputationQualificationAdapter,
  ],
  exports: [ReputationQualificationAdapter],
})
export class ReputationQualificationReadModule {}
