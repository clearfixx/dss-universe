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
import { FORUM_TOPIC_COUNTS } from './contracts/forum-topic-counts.contract';
import { PrismaForumTopicCounts } from './infrastructure/prisma-forum-topic-counts';

@Module({
  imports: [PrismaModule],
  providers: [
    { provide: FORUM_TOPIC_COUNTS, useClass: PrismaForumTopicCounts },
  ],
  exports: [FORUM_TOPIC_COUNTS],
})
export class ForumFactsModule {}
