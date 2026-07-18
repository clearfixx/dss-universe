import {
  Injectable,
  Logger,
  type OnApplicationShutdown,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OutboxDispatcherService } from './outbox-dispatcher.service';

@Injectable()
export class OutboxDispatcherRunnerService
  implements OnModuleInit, OnApplicationShutdown
{
  private readonly logger = new Logger(OutboxDispatcherRunnerService.name);
  private timer?: NodeJS.Timeout;
  constructor(
    private readonly config: ConfigService,
    private readonly dispatcher: OutboxDispatcherService,
  ) {}
  onModuleInit(): void {
    const interval = this.config.get<number>(
      'OUTBOX_DISPATCH_INTERVAL_MS',
      1000,
    );
    if (interval > 0) {
      void this.runOnce();
      this.timer = setInterval(() => void this.runOnce(), interval);
      this.timer.unref();
    }
  }
  onApplicationShutdown(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private async runOnce(): Promise<void> {
    try {
      await this.dispatcher.recoverStaleProcessing();
      await this.dispatcher.dispatchPending();
    } catch (error) {
      this.logger.error('Outbox dispatch cycle failed.', error);
    }
  }
}
