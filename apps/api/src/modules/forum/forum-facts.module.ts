/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Forum (Community Hub)
 * 📄 File: apps/api/src/modules/forum/forum-facts.module.ts
 *
 * 🎯 Purpose:
 * Publishes FORUM_TOPIC_COUNTS from a dependency-free module so Content Access
 * composition can bind it without importing the full Forum module.
 *
 * ⚠️ Important:
 * ForumModule depends on global composition ports; importing it there would
 * create a provider cycle.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Module } from '@nestjs/common';
import { PrismaModule } from '@api/core/database';
import { AuthorizationModule } from '@api/core/authorization';
import { FORUM_SUBJECT_VISIBILITY } from './contracts/forum-subject-visibility.contract';
import { FORUM_VIEWER_FACTS } from './contracts/forum-viewer-facts.contract';
import { ForumViewerFactsAdapter } from './infrastructure/forum-viewer-facts.adapter';
import { PrismaForumSubjectVisibility } from './infrastructure/prisma-forum-subject-visibility';
import { FORUM_TOPIC_COUNTS } from './contracts/forum-topic-counts.contract';
import { PrismaForumTopicCounts } from './infrastructure/prisma-forum-topic-counts';

@Module({
  imports: [PrismaModule, AuthorizationModule],
  providers: [
    { provide: FORUM_TOPIC_COUNTS, useClass: PrismaForumTopicCounts },
    ForumViewerFactsAdapter,
    { provide: FORUM_VIEWER_FACTS, useExisting: ForumViewerFactsAdapter },
    {
      provide: FORUM_SUBJECT_VISIBILITY,
      useClass: PrismaForumSubjectVisibility,
    },
  ],
  exports: [FORUM_TOPIC_COUNTS, FORUM_SUBJECT_VISIBILITY],
})
export class ForumFactsModule {}
