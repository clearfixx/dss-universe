import { Global, Module } from '@nestjs/common';
import { RedisModule } from '../cache';
import { OutboxDispatcherRunnerService } from './services/outbox-dispatcher-runner.service';
import { OutboxDispatcherService } from './services/outbox-dispatcher.service';
import { QueueRegistryService } from './services/queue-registry.service';

@Global()
@Module({
  imports: [RedisModule],
  providers: [
    QueueRegistryService,
    OutboxDispatcherService,
    OutboxDispatcherRunnerService,
  ],
  exports: [QueueRegistryService, OutboxDispatcherService],
})
export class QueueModule {}
