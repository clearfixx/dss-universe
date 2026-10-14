/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Content Target Composition
 * 📄 File: apps/api/src/composition/content-targets/content-target-composition.module.ts
 *
 * 🎯 Purpose:
 * Binds semantic cross-owner write operations without exposing ORM clients to features.
 *
 * 🧠 Responsibilities:
 * • binds the two owner-specific semantic write ports;
 * • keeps the stateless technical target writer private to this assembly.
 *
 * 🏗️ Architecture:
 * Explicit root Nest assembly; no business repository is exported.
 *
 * ⚠️ Important:
 * Prisma transaction arguments remain inside infrastructure, not feature/application ports.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '@api/core/database';
import { AuditModule } from '@api/core/audit';
import { EventsModule } from '@api/core/events';
import { NEWS_DRAFT_TRANSACTION } from '@api/modules/news';
import { PROFILE_WALL_TRANSACTION } from '@api/modules/users';
import { PrismaInteractionTargetWriter } from '@api/modules/interactions/infrastructure';
import { PrismaNewsDraftTransaction } from './infrastructure/prisma-news-draft.transaction';
import { PrismaProfileWallTransaction } from './infrastructure/prisma-profile-wall.transaction';

@Global()
@Module({
  imports: [PrismaModule, AuditModule, EventsModule],
  providers: [
    PrismaInteractionTargetWriter,
    { provide: NEWS_DRAFT_TRANSACTION, useClass: PrismaNewsDraftTransaction },
    {
      provide: PROFILE_WALL_TRANSACTION,
      useClass: PrismaProfileWallTransaction,
    },
  ],
  exports: [NEWS_DRAFT_TRANSACTION, PROFILE_WALL_TRANSACTION],
})
export class ContentTargetCompositionModule {}
