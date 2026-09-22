import { Module } from '@nestjs/common';

import { AuditModule } from '@api/core/audit';
import { AuthorizationModule } from '@api/core/authorization';
import { PrismaModule } from '@api/core/database';
import { EventsModule } from '@api/core/events';
import { EditorModule } from '../editor';
import { InteractionsModule } from '../interactions';
import { MediaModule } from '../media/media.module';

import { NewsInteractionPolicy } from './application/services/news-interaction.policy';
import { NewsDeliveryService } from './application/services/news-delivery.service';
import { NewsPostTemplateService } from './application/services/news-post-template.service';
import { NewsLinksService } from './application/services/news-links.service';
import { NewsSchedulerService } from './application/services/news-scheduler.service';
import { NewsSettingsService } from './application/services/news-settings.service';
import { NewsService } from './application/services/news.service';
import { NewsTaxonomyService } from './application/services/news-taxonomy.service';
import { NewsWorkflowService } from './application/services/news-workflow.service';
import { NewsPinsService } from './application/services/news-pins.service';
import { NEWS_REPOSITORY } from './domain/repositories/news.repository.interface';
import { NEWS_DELIVERY_REPOSITORY } from './domain/repositories/news-delivery.repository.interface';
import { NEWS_LINKS_REPOSITORY } from './domain/repositories/news-links.repository.interface';
import { NEWS_SETTINGS_REPOSITORY } from './domain/repositories/news-settings.repository.interface';
import { NEWS_TAXONOMY_REPOSITORY } from './domain/repositories/news-taxonomy.repository.interface';
import { NEWS_WORKFLOW_REPOSITORY } from './domain/repositories/news-workflow.repository.interface';
import { NEWS_PINS_REPOSITORY } from './domain/repositories/news-pins.repository.interface';
import { PrismaNewsRepository } from './infrastructure/repositories/prisma-news.repository';
import { PrismaNewsDeliveryRepository } from './infrastructure/repositories/prisma-news-delivery.repository';
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
  imports: [
    PrismaModule,
    AuditModule,
    AuthorizationModule,
    EventsModule,
    EditorModule,
    InteractionsModule,
    MediaModule,
  ],
  providers: [
    NewsDeliveryResolver,
    OptionalNewsJwtGuard,
    NewsSettingsResolver,
    NewsEditorialResolver,
    NewsPinsResolver,
    NewsService,
    NewsDeliveryService,
    NewsLinksService,
    NewsSchedulerService,
    NewsSettingsService,
    NewsTaxonomyService,
    NewsWorkflowService,
    NewsPinsService,
    NewsPostTemplateService,
    NewsInteractionPolicy,
    { provide: NEWS_REPOSITORY, useClass: PrismaNewsRepository },
    {
      provide: NEWS_DELIVERY_REPOSITORY,
      useClass: PrismaNewsDeliveryRepository,
    },
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
  exports: [
    NewsService,
    NewsDeliveryService,
    NewsLinksService,
    NewsSchedulerService,
    NewsSettingsService,
    NewsTaxonomyService,
    NewsWorkflowService,
    NewsPinsService,
    NewsPostTemplateService,
    NEWS_REPOSITORY,
    NEWS_DELIVERY_REPOSITORY,
    NEWS_LINKS_REPOSITORY,
    NEWS_SETTINGS_REPOSITORY,
    NEWS_TAXONOMY_REPOSITORY,
    NEWS_WORKFLOW_REPOSITORY,
    NEWS_PINS_REPOSITORY,
  ],
})
export class NewsModule {}
