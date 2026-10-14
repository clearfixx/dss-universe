/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Content Read Composition
 * 📄 File: apps/api/src/composition/content-reads/content-read-integration.module.ts
 *
 * 🎯 Purpose:
 * Binds separate Media and Activity read contracts without moving feature policy.
 *
 * 🧠 Responsibilities:
 * • exposes only the operation-specific data required by its consumer;
 * • preserves owner validation and propagates failures without defaults.
 *
 * 🏗️ Architecture:
 * Narrow dependency boundary; policy and persistence stay with their owners.
 *
 * ⚠️ Important:
 * No credentials, gate aggregate or ORM transaction crosses this boundary.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Global, Module } from '@nestjs/common';
import { MediaModule } from '@api/modules/media';
import { ActivityModule } from '@api/modules/activity';
import { NEWS_MEDIA_EVIDENCE } from '@api/modules/news';
import { PROFILE_ACTIVITY_READER } from '@api/modules/users';
import { NewsMediaEvidenceAdapter } from './infrastructure/news-media-evidence.adapter';
import { ProfileActivityAdapter } from './infrastructure/profile-activity.adapter';

@Global()
@Module({
  imports: [MediaModule, ActivityModule],
  providers: [
    { provide: NEWS_MEDIA_EVIDENCE, useClass: NewsMediaEvidenceAdapter },
    { provide: PROFILE_ACTIVITY_READER, useClass: ProfileActivityAdapter },
  ],
  exports: [NEWS_MEDIA_EVIDENCE, PROFILE_ACTIVITY_READER],
})
export class ContentReadIntegrationModule {}
