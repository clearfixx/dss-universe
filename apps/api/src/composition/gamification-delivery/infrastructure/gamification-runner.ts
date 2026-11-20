/** Host lifecycle; importing this class does not load environment configuration. */
import { Injectable, type OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GamificationDeliveryPump } from '../application/delivery-pump';
import { GamificationBroker } from './gamification-broker';
import { PrismaRuntimeOperations } from './prisma-runtime-operations';

@Injectable()
export class GamificationRuntimeRunner implements OnApplicationShutdown {
  private timer?: ReturnType<typeof setInterval>;
  private running?: Promise<void>;
  constructor(
    private readonly config: ConfigService,
    private readonly operations: PrismaRuntimeOperations,
    private readonly broker: GamificationBroker,
    private readonly pump: GamificationDeliveryPump,
  ) {}
  async start(): Promise<void> {
    if (this.timer) throw new Error('Gamification runner already started.');
    if (this.config.get<string>('DSS_GAMIFICATION_ENABLED') !== '1') return;
    await this.operations.preflight();
    await this.broker.start();
    this.timer = setInterval(() => {
      if (this.running) return;
      this.running = this.pump
        .tick()
        .catch(() =>
          console.error(
            'Gamification delivery tick failed; durable recovery remains pending.',
          ),
        )
        .finally(() => {
          this.running = undefined;
        });
    }, 1000);
  }
  async onApplicationShutdown(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    await this.running;
    await this.broker.close();
  }
}
