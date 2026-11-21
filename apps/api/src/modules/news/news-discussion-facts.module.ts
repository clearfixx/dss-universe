/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: News
 * 📄 File: apps/api/src/modules/news/news-discussion-facts.module.ts
 *
 * 🎯 Purpose:
 * Publishes NEWS_DISCUSSION_FACTS from a dependency-free module so root
 * composition can bind it without importing the full News module.
 *
 * ⚠️ Important:
 * Importing NewsModule from global composition would create a provider cycle.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Module } from '@nestjs/common';
import { PrismaModule } from '@api/core/database';
import { NEWS_DISCUSSION_FACTS } from './contracts/news-discussion-facts.contract';
import { PrismaNewsDiscussionFactsReader } from './infrastructure/discussion/prisma-news-discussion-facts.reader';

@Module({
  imports: [PrismaModule],
  providers: [
    {
      provide: NEWS_DISCUSSION_FACTS,
      useClass: PrismaNewsDiscussionFactsReader,
    },
  ],
  exports: [NEWS_DISCUSSION_FACTS],
})
export class NewsDiscussionFactsModule {}
