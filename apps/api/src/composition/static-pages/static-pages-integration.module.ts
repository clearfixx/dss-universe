/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Static Pages Composition
 * 📄 File: apps/api/src/composition/static-pages/static-pages-integration.module.ts
 *
 * 🎯 Purpose:
 * Provides the file port of static pages.
 *
 * ⚠️ Important:
 * Wiring only.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '@api/core/database';
import { MediaModule } from '@api/modules/media';
import { STATIC_PAGE_MEDIA } from '@api/modules/static-pages/infrastructure';
import { StaticPageMediaAdapter } from './infrastructure/static-page-media.adapter';

@Global()
@Module({
  imports: [PrismaModule, MediaModule],
  providers: [{ provide: STATIC_PAGE_MEDIA, useClass: StaticPageMediaAdapter }],
  exports: [STATIC_PAGE_MEDIA],
})
export class StaticPagesIntegrationModule {}
