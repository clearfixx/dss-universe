/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: News
 * 📄 File: apps/api/src/modules/news/news.module.ts
 *
 * 🎯 Purpose:
 * Composes News use cases and persistence without importing Editor implementations.
 *
 * 🧠 Responsibilities:
 * • registers News presentation, application and repository providers;
 * • receives canonical document normalization through root composition.
 *
 * 🏗️ Architecture:
 * Nest assembly; root composition supplies Editor/Media reads and policy registration.
 *
 * ⚠️ Important:
 * Only search maintenance and interaction decision tokens leave this Nest assembly.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Module } from '@nestjs/common';
import { NewsSearchBackfillService } from './application/services/news-search-backfill.service';
import { NEWS_SEARCH_INDEX_MAINTENANCE } from './contracts/news-search-index-maintenance.contract';
import { NEWS_SEARCH_PROJECTION_REPOSITORY } from './domain/repositories/news-search-projection.repository.interface';
import { PrismaNewsSearchProjectionRepository } from './infrastructure/repositories/prisma-news-search-projection.repository';

import { AuditModule } from '@api/core/audit';
import { AuthorizationModule } from '@api/core/authorization';
import { PrismaModule } from '@api/core/database';
import { EventsModule } from '@api/core/events';

import { NewsInteractionPolicy } from './application/services/news-interaction.policy';
import { NEWS_INTERACTION_DECISIONS } from './contracts/news-interaction-decisions.contract';
import { NewsDeliveryService } from './application/services/news-delivery.service';
import { NewsAttachmentDeliveryService } from './application/services/news-attachment-delivery.service';
import { NewsPostTemplateService } from './application/services/news-post-template.service';
import { NewsLinksService } from './application/services/news-links.service';
import { NewsSchedulerService } from './application/services/news-scheduler.service';
import { NewsSettingsService } from './application/services/news-settings.service';
import { NewsService } from './application/services/news.service';
import { NewsTaxonomyService } from './application/services/news-taxonomy.service';
import { NewsWorkflowService } from './application/services/news-workflow.service';
import { NewsPinsService } from './application/services/news-pins.service';
import { NEWS_REPOSITORY } from './domain/repositories/news.repository.interface';
import { NEWS_LINKS_REPOSITORY } from './domain/repositories/news-links.repository.interface';
import { NEWS_SETTINGS_REPOSITORY } from './domain/repositories/news-settings.repository.interface';
import { NEWS_TAXONOMY_REPOSITORY } from './domain/repositories/news-taxonomy.repository.interface';
import { NEWS_WORKFLOW_REPOSITORY } from './domain/repositories/news-workflow.repository.interface';
import { NEWS_PINS_REPOSITORY } from './domain/repositories/news-pins.repository.interface';
import { PrismaNewsRepository } from './infrastructure/repositories/prisma-news.repository';
import { PrismaNewsLinksRepository } from './infrastructure/repositories/prisma-news-links.repository';
import { PrismaNewsSettingsRepository } from './infrastructure/repositories/prisma-news-settings.repository';
import { PrismaNewsTaxonomyRepository } from './infrastructure/repositories/prisma-news-taxonomy.repository';
import { PrismaNewsWorkflowRepository } from './infrastructure/repositories/prisma-news-workflow.repository';
import { PrismaNewsPinsRepository } from './infrastructure/repositories/prisma-news-pins.repository';
import { NewsSettingsResolver } from './presentation/graphql/news-settings.graphql';
import { NewsEditorialResolver } from './presentation/graphql/news-editorial.graphql';
import {
  NewsDeliveryResolver,
  OptionalNewsJwtGuard,
} from './presentation/graphql/news-delivery.graphql';
import { NewsPinsResolver } from './presentation/graphql/news-pins.graphql';

@Module({
  imports: [PrismaModule, AuditModule, AuthorizationModule, EventsModule],
  providers: [
    NewsSearchBackfillService,
    {
      provide: NEWS_SEARCH_INDEX_MAINTENANCE,
      useExisting: NewsSearchBackfillService,
    },
    {
      provide: NEWS_SEARCH_PROJECTION_REPOSITORY,
      useClass: PrismaNewsSearchProjectionRepository,
    },
    NewsDeliveryResolver,
    OptionalNewsJwtGuard,
    NewsSettingsResolver,
    NewsEditorialResolver,
    NewsPinsResolver,
    NewsService,
    NewsDeliveryService,
    NewsAttachmentDeliveryService,
    NewsLinksService,
    NewsSchedulerService,
    NewsSettingsService,
    NewsTaxonomyService,
    NewsWorkflowService,
    NewsPinsService,
    NewsPostTemplateService,
    NewsInteractionPolicy,
    { provide: NEWS_INTERACTION_DECISIONS, useExisting: NewsInteractionPolicy },
    { provide: NEWS_REPOSITORY, useClass: PrismaNewsRepository },
    { provide: NEWS_LINKS_REPOSITORY, useClass: PrismaNewsLinksRepository },
    {
      provide: NEWS_SETTINGS_REPOSITORY,
      useClass: PrismaNewsSettingsRepository,
    },
    {
      provide: NEWS_TAXONOMY_REPOSITORY,
      useClass: PrismaNewsTaxonomyRepository,
    },
    {
      provide: NEWS_WORKFLOW_REPOSITORY,
      useClass: PrismaNewsWorkflowRepository,
    },
    { provide: NEWS_PINS_REPOSITORY, useClass: PrismaNewsPinsRepository },
  ],
  exports: [NEWS_SEARCH_INDEX_MAINTENANCE, NEWS_INTERACTION_DECISIONS],
})
export class NewsModule {}
