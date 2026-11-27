/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Moderation Bans Composition
 * 📄 File: apps/api/src/composition/moderation-bans/moderation-bans-integration.module.ts
 *
 * 🎯 Purpose:
 * Binds Moderation's ban transaction to the Auth and Moderation owners.
 *
 * ⚠️ Important:
 * Wiring only; no ban rules live here.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Global, Module } from '@nestjs/common';
import { AuditModule } from '@api/core/audit';
import { PrismaModule } from '@api/core/database';
import { EventsModule } from '@api/core/events';
import { AuthModule } from '@api/modules/auth';
import { PrismaAccountBanWriter } from '@api/modules/auth/infrastructure';
import { BAN_TRANSACTION } from '@api/modules/moderation';
import { PrismaAccountBanLedger } from '@api/modules/moderation/infrastructure';
import { PrismaBanTransaction } from './infrastructure/prisma-ban.transaction';

@Global()
@Module({
  imports: [PrismaModule, AuditModule, EventsModule, AuthModule],
  providers: [
    PrismaAccountBanWriter,
    PrismaAccountBanLedger,
    { provide: BAN_TRANSACTION, useClass: PrismaBanTransaction },
  ],
  exports: [BAN_TRANSACTION],
})
export class ModerationBansIntegrationModule {}
