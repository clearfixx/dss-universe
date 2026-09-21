import { Module } from '@nestjs/common';

import { AuditModule } from '@api/core/audit';
import { AuthorizationModule } from '@api/core/authorization';
import { PrismaModule } from '@api/core/database';
import { EventsModule } from '@api/core/events';
import { EditorModule } from '../editor';
import { InteractionsModule } from '../interactions';

import { NewsInteractionPolicy } from './application/services/news-interaction.policy';
import { NewsPostTemplateService } from './application/services/news-post-template.service';
import { NewsService } from './application/services/news.service';
import { NewsTaxonomyService } from './application/services/news-taxonomy.service';
import { NewsWorkflowService } from './application/services/news-workflow.service';
import { NEWS_REPOSITORY } from './domain/repositories/news.repository.interface';
import { NEWS_TAXONOMY_REPOSITORY } from './domain/repositories/news-taxonomy.repository.interface';
import { NEWS_WORKFLOW_REPOSITORY } from './domain/repositories/news-workflow.repository.interface';
import { PrismaNewsRepository } from './infrastructure/repositories/prisma-news.repository';
import { PrismaNewsTaxonomyRepository } from './infrastructure/repositories/prisma-news-taxonomy.repository';
import { PrismaNewsWorkflowRepository } from './infrastructure/repositories/prisma-news-workflow.repository';

@Module({
  imports: [
    PrismaModule,
    AuditModule,
    AuthorizationModule,
    EventsModule,
    EditorModule,
    InteractionsModule,
  ],
  providers: [
    NewsService,
    NewsTaxonomyService,
    NewsWorkflowService,
    NewsPostTemplateService,
    NewsInteractionPolicy,
    { provide: NEWS_REPOSITORY, useClass: PrismaNewsRepository },
    {
      provide: NEWS_TAXONOMY_REPOSITORY,
      useClass: PrismaNewsTaxonomyRepository,
    },
    {
      provide: NEWS_WORKFLOW_REPOSITORY,
      useClass: PrismaNewsWorkflowRepository,
    },
  ],
  exports: [
    NewsService,
    NewsTaxonomyService,
    NewsWorkflowService,
    NewsPostTemplateService,
    NEWS_REPOSITORY,
    NEWS_TAXONOMY_REPOSITORY,
    NEWS_WORKFLOW_REPOSITORY,
  ],
})
export class NewsModule {}
