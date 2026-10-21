import { Injectable } from '@nestjs/common';

import { AuditWriterService } from '@api/core/audit';
import { PrismaService } from '@api/core/database';
import { createEventEnvelope, OutboxWriterService } from '@api/core/events';
import type { NewsSettingsRepository } from '../../domain/repositories/news-settings.repository.interface';
import type {
  NewsSettings,
  UpdateNewsSettings,
} from '../../domain/types/news-settings.type';

const SETTINGS_ID = 'default';

@Injectable()
export class PrismaNewsSettingsRepository implements NewsSettingsRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditWriterService,
    private readonly outbox: OutboxWriterService,
  ) {}

  async get(): Promise<NewsSettings> {
    const settings = await this.prisma.newsSettings.findUniqueOrThrow({
      where: { id: SETTINGS_ID },
    });
    return settings;
  }

  update(input: UpdateNewsSettings): Promise<NewsSettings> {
    return this.prisma.$transaction(async (transaction) => {
      await transaction.$executeRaw`
        SELECT pg_advisory_xact_lock(hashtext('news:settings'))
      `;
      const { actorId, ...values } = input;
      const settings = await transaction.newsSettings.upsert({
        where: { id: SETTINGS_ID },
        update: { ...values, updatedById: actorId },
        create: { id: SETTINGS_ID, ...values, updatedById: actorId },
      });
      const payload = { ...values, settingsId: SETTINGS_ID };
      await this.audit.append(transaction, {
        action: 'news.settings.updated',
        actorType: 'USER',
        actorId,
        targetType: 'NewsSettings',
        targetId: SETTINGS_ID,
        metadata: payload,
      });
      await this.outbox.append(
        transaction,
        createEventEnvelope({
          name: 'news.settings.updated.v1',
          version: 1,
          category: 'domain',
          producer: 'dss.api.news',
          actorId,
          aggregate: { type: 'NewsSettings', id: SETTINGS_ID },
          payload,
        }),
      );
      return settings;
    });
  }
}
