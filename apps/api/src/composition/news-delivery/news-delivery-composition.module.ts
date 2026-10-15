/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: News Delivery Composition
 * 📄 File: apps/api/src/composition/news-delivery/news-delivery-composition.module.ts
 *
 * 🎯 Purpose:
 * Binds the News-owned semantic delivery port to explicit cross-owner read composition.
 *
 * 🧠 Responsibilities:
 * • keeps technical persistence adapters private to root assembly;
 * • exports only the consumer-owned semantic read capability.
 *
 * 🏗️ Architecture:
 * Root Nest assembly; no feature-to-feature service dependency or ORM business API.
 *
 * ⚠️ Important:
 * Global binding follows existing composition conventions; it is not a service locator.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '@api/core/database';
import { NEWS_DELIVERY_READER } from '@api/modules/news';
import {
  PrismaNewsDeliveryRepository,
  PrismaNewsSearchSession,
} from '@api/modules/news/infrastructure';
import { PrismaPublicProfileReader } from '@api/modules/users/infrastructure';
import { PrismaInteractionDeliveryReader } from '@api/modules/interactions/infrastructure';
import { PrismaNewsDeliveryReadUnit } from './infrastructure/prisma-news-delivery.read-unit';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [
    PrismaNewsSearchSession,
    PrismaNewsDeliveryRepository,
    PrismaPublicProfileReader,
    PrismaInteractionDeliveryReader,
    { provide: NEWS_DELIVERY_READER, useClass: PrismaNewsDeliveryReadUnit },
  ],
  exports: [NEWS_DELIVERY_READER],
})
export class NewsDeliveryCompositionModule {}
