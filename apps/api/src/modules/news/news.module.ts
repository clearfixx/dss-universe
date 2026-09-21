import { Module } from '@nestjs/common';

import { AuditModule } from '@api/core/audit';
import { PrismaModule } from '@api/core/database';
import { EventsModule } from '@api/core/events';
import { EditorModule } from '../editor';
import { InteractionsModule } from '../interactions';

import { NewsInteractionPolicy } from './application/services/news-interaction.policy';
import { NewsService } from './application/services/news.service';
import { NewsTaxonomyService } from './application/services/news-taxonomy.service';
import { NEWS_REPOSITORY } from './domain/repositories/news.repository.interface';
import { NEWS_TAXONOMY_REPOSITORY } from './domain/repositories/news-taxonomy.repository.interface';
import { PrismaNewsRepository } from './infrastructure/repositories/prisma-news.repository';
import { PrismaNewsTaxonomyRepository } from './infrastructure/repositories/prisma-news-taxonomy.repository';

@Module({
  imports: [
    PrismaModule,
    AuditModule,
    EventsModule,
    EditorModule,
    InteractionsModule,
  ],
  providers: [
    NewsService,
    NewsTaxonomyService,
    NewsInteractionPolicy,
    { provide: NEWS_REPOSITORY, useClass: PrismaNewsRepository },
    {
      provide: NEWS_TAXONOMY_REPOSITORY,
      useClass: PrismaNewsTaxonomyRepository,
    },
  ],
  exports: [
    NewsService,
    NewsTaxonomyService,
    NEWS_REPOSITORY,
    NEWS_TAXONOMY_REPOSITORY,
  ],
})
export class NewsModule {}
