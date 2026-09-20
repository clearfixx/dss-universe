import { Module } from '@nestjs/common';

import { AuditModule } from '@api/core/audit';
import { PrismaModule } from '@api/core/database';
import { EventsModule } from '@api/core/events';
import { EditorModule } from '../editor';
import { InteractionsModule } from '../interactions';

import { NewsInteractionPolicy } from './application/services/news-interaction.policy';
import { NewsService } from './application/services/news.service';
import { NEWS_REPOSITORY } from './domain/repositories/news.repository.interface';
import { PrismaNewsRepository } from './infrastructure/repositories/prisma-news.repository';

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
    NewsInteractionPolicy,
    { provide: NEWS_REPOSITORY, useClass: PrismaNewsRepository },
  ],
  exports: [NewsService, NEWS_REPOSITORY],
})
export class NewsModule {}
