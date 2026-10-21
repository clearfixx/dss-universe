import {
  Injectable,
  Logger,
  type OnApplicationShutdown,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { NewsWorkflowService } from './news-workflow.service';

@Injectable()
export class NewsSchedulerService
  implements OnModuleInit, OnApplicationShutdown
{
  private readonly logger = new Logger(NewsSchedulerService.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly config: ConfigService,
    private readonly workflow: NewsWorkflowService,
  ) {}

  onModuleInit(): void {
    const interval = this.config.get<number>('NEWS_SCHEDULER_INTERVAL_MS', 0);
    if (interval > 0) {
      this.timer = setInterval(() => void this.runOnce(), interval);
      this.timer.unref();
    }
  }

  onApplicationShutdown(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async runOnce(now = new Date()): Promise<number> {
    if (this.running) return 0;
    this.running = true;
    try {
      return (await this.workflow.publishDue(now)).length;
    } catch (error) {
      this.logger.error('Scheduled News publication cycle failed.', error);
      return 0;
    } finally {
      this.running = false;
    }
  }
}
