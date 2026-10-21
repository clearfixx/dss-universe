/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media
 * 📄 File: apps/api/src/modules/media/application/services/media-retention.service.ts
 *
 * 🎯 Purpose:
 * Purges old unreferenced media binaries through an idempotent lifecycle.
 *
 * 🧠 Responsibilities:
 * • claims only retention-eligible unreferenced media;
 * • deletes original and variant objects through StorageService;
 * • persists DELETED completion or an audited retryable failure.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import {
  Inject,
  Injectable,
  type OnApplicationShutdown,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { StorageService } from '@api/core/storage';

import {
  MEDIA_REPOSITORY,
  type MediaRepository,
} from '../../domain/repositories/media.repository.interface';

const CLEANUP_BATCH_SIZE = 50;
const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class MediaRetentionService
  implements OnModuleInit, OnApplicationShutdown
{
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    @Inject(MEDIA_REPOSITORY)
    private readonly media: MediaRepository,
    private readonly storage: StorageService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit(): void {
    const interval = this.config.get<number>('MEDIA_CLEANUP_INTERVAL_MS', 0);
    if (interval > 0) {
      this.timer = setInterval(() => void this.runOnce(), interval);
      this.timer.unref();
    }
  }

  onApplicationShutdown(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  async runOnce(now = new Date()): Promise<number> {
    if (this.running) {
      return 0;
    }
    this.running = true;
    try {
      const retentionDays = this.config.get<number>('MEDIA_RETENTION_DAYS', 30);
      const olderThan = new Date(now.getTime() - retentionDays * DAY_MS);
      const candidates = await this.media.claimCleanupCandidates(
        olderThan,
        CLEANUP_BATCH_SIZE,
      );
      let completed = 0;
      for (const candidate of candidates) {
        try {
          for (const storageKey of new Set(candidate.storageKeys)) {
            await this.storage.delete(storageKey);
          }
          await this.media.completeCleanup(candidate.mediaId);
          completed += 1;
        } catch (error) {
          await this.media.recordCleanupFailure(
            candidate.mediaId,
            this.failureReason(error),
          );
        }
      }
      return completed;
    } finally {
      this.running = false;
    }
  }

  private failureReason(error: unknown): string {
    return (
      error instanceof Error ? error.message : 'Unknown cleanup failure'
    ).slice(0, 500);
  }
}
