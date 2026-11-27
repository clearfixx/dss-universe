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
import { MEDIA_APPEAL_SCREENSHOTS, MediaModule } from '@api/modules/media';
import {
  APPEAL_SCREENSHOT_FILES,
  BAN_APPEAL_TRANSACTION,
  BAN_TRANSACTION,
} from '@api/modules/moderation';
import {
  PrismaAccountBanLedger,
  PrismaBanAppealLedger,
} from '@api/modules/moderation/infrastructure';
import { PrismaBanAppealTransaction } from './infrastructure/prisma-ban-appeal.transaction';
import { PrismaBanTransaction } from './infrastructure/prisma-ban.transaction';

@Global()
@Module({
  imports: [PrismaModule, AuditModule, EventsModule, AuthModule, MediaModule],
  providers: [
    PrismaAccountBanWriter,
    PrismaAccountBanLedger,
    { provide: BAN_TRANSACTION, useClass: PrismaBanTransaction },
    PrismaBanAppealLedger,
    { provide: BAN_APPEAL_TRANSACTION, useClass: PrismaBanAppealTransaction },
    { provide: APPEAL_SCREENSHOT_FILES, useExisting: MEDIA_APPEAL_SCREENSHOTS },
  ],
  exports: [BAN_TRANSACTION, BAN_APPEAL_TRANSACTION, APPEAL_SCREENSHOT_FILES],
})
export class ModerationBansIntegrationModule {}
