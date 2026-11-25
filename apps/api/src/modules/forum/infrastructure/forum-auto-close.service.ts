/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Forum (Community Hub)
 * 📄 File: apps/api/src/modules/forum/infrastructure/forum-auto-close.service.ts
 *
 * 🎯 Purpose:
 * "Автозакриття неактивних тем" (Command Deck section setting): closes open
 * topics whose last post is older than the section's autoCloseDays, and a
 * small interval runner that triggers it.
 *
 * ⚠️ Important:
 * Each closure is audited as a SYSTEM action and emits the usual
 * `forum.topic.closed.v1` event with `byAutoClose: true`. The runner
 * interval comes from FORUM_AUTO_CLOSE_INTERVAL_MS (default one hour;
 * 0 turns it off, e.g. in tests). Batches are bounded per run.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import {
  Injectable,
  Logger,
  type OnApplicationShutdown,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuditWriterService } from '@api/core/audit';
import { PrismaService } from '@api/core/database';
import { createEventEnvelope, OutboxWriterService } from '@api/core/events';

const BATCH = 200;

@Injectable()
export class ForumAutoCloseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditWriterService,
    private readonly outbox: OutboxWriterService,
  ) {}

  /** Closes inactive open topics; returns how many were closed. */
  async closeInactive(now = new Date()): Promise<number> {
    const forums = await this.prisma.forum.findMany({
      where: { autoCloseDays: { not: null } },
      select: { id: true, autoCloseDays: true },
    });
    let closed = 0;
    for (const forum of forums) {
      const cutoff = new Date(
        now.getTime() - forum.autoCloseDays! * 86_400_000,
      );
      const stale = await this.prisma.forumTopic.findMany({
        where: {
          forumId: forum.id,
          state: 'OPEN',
          mergedIntoTopicId: null,
          lastPostAt: { lt: cutoff },
        },
        select: { id: true },
        orderBy: { lastPostAt: 'asc' },
        take: BATCH,
      });
      for (const { id } of stale) {
        const done = await this.prisma.$transaction(async (tx) => {
          const updated = await tx.forumTopic.updateMany({
            where: { id, state: 'OPEN', lastPostAt: { lt: cutoff } },
            data: { state: 'CLOSED' },
          });
          if (updated.count !== 1) return false;
          const metadata = {
            byAutoClose: true,
            autoCloseDays: forum.autoCloseDays,
          };
          await this.audit.append(tx, {
            action: 'forum.topic_closed',
            actorType: 'SYSTEM',
            targetType: 'ForumTopic',
            targetId: id,
            metadata,
          });
          await this.outbox.append(
            tx,
            createEventEnvelope({
              name: 'forum.topic.closed.v1',
              version: 1,
              category: 'integration',
              producer: 'dss.api.forum',
              aggregate: { type: 'ForumTopic', id },
              payload: { topicId: id, ...metadata },
            }),
          );
          return true;
        });
        if (done) closed++;
      }
    }
    return closed;
  }
}

@Injectable()
export class ForumAutoCloseRunner
  implements OnModuleInit, OnApplicationShutdown
{
  private readonly logger = new Logger(ForumAutoCloseRunner.name);
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly config: ConfigService,
    private readonly autoClose: ForumAutoCloseService,
  ) {}

  onModuleInit(): void {
    const interval = Number(
      this.config.get('FORUM_AUTO_CLOSE_INTERVAL_MS', 3_600_000),
    );
    if (!Number.isFinite(interval) || interval <= 0) return;
    this.timer = setInterval(() => void this.runOnce(), interval);
    this.timer.unref();
  }

  onApplicationShutdown(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private async runOnce(): Promise<void> {
    try {
      const closed = await this.autoClose.closeInactive();
      if (closed > 0) this.logger.log(`Auto-closed ${closed} inactive topics.`);
    } catch (error) {
      this.logger.error('Forum auto-close run failed.', error);
    }
  }
}
