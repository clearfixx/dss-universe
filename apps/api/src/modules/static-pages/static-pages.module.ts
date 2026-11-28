/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Static Pages
 * 📄 File: apps/api/src/modules/static-pages/static-pages.module.ts
 *
 * 🎯 Purpose:
 * Assembles static pages.
 *
 * ⚠️ Important:
 * The file port is bound by root composition.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Module } from '@nestjs/common';
import { AuthorizationModule } from '@api/core/authorization';
import { EditorModule } from '@api/modules/editor';
import { StaticPagesService } from './infrastructure/prisma-static-pages';
import { StaticPageFilesController } from './presentation/static-page-files.controller';
import { StaticPagesResolver } from './presentation/static-pages.resolver';

@Module({
  imports: [AuthorizationModule, EditorModule],
  providers: [StaticPagesService, StaticPagesResolver],
  controllers: [StaticPageFilesController],
})
export class StaticPagesModule {}
