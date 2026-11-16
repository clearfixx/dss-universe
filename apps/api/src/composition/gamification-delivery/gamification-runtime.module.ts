/** API-owned headless runtime. HTTP, GraphQL and Activity workers are not imported. */
import { Module } from '@nestjs/common';
import { GamificationConsumerCompositionModule } from '../gamification/gamification-consumer-composition.module';
import { GamificationOperationsModule } from './gamification-operations.module';
import { GamificationConsumptionModule } from './gamification-consumption.module';
import { GamificationCoordinator } from './application/gamification-coordinator';
import {
  GamificationDeliveryPump,
  GAMIFICATION_WAKE_QUEUE,
} from './application/delivery-pump';
import { GamificationBroker } from './infrastructure/gamification-broker';
import { GamificationRuntimeRunner } from './infrastructure/gamification-runner';

@Module({
  imports: [
    GamificationOperationsModule,
    GamificationConsumptionModule,
    GamificationConsumerCompositionModule,
  ],
  providers: [
    GamificationCoordinator,
    GamificationBroker,
    GamificationDeliveryPump,
    GamificationRuntimeRunner,
    { provide: GAMIFICATION_WAKE_QUEUE, useExisting: GamificationBroker },
  ],
})
export class GamificationRuntimeModule {}
