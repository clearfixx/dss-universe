/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Forum (Community Hub)
 * 📄 File: apps/api/src/modules/forum/forum.module.ts
 *
 * 🎯 Purpose:
 * Establishes the Community Hub owner boundary with its CH-0 structure.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Module } from '@nestjs/common';
import { AuthorizationModule } from '@api/core/authorization';
import { FORUM_VIEWER_FACTS } from './contracts/forum-viewer-facts.contract';
import { ForumViewerFactsAdapter } from './infrastructure/forum-viewer-facts.adapter';
import { ForumStructureService } from './infrastructure/prisma-forum-structure';
import { ForumStructureResolver } from './presentation/forum-structure.resolver';

@Module({
  imports: [AuthorizationModule],
  providers: [
    ForumViewerFactsAdapter,
    { provide: FORUM_VIEWER_FACTS, useExisting: ForumViewerFactsAdapter },
    ForumStructureService,
    ForumStructureResolver,
  ],
  exports: [],
})
export class ForumModule {}
