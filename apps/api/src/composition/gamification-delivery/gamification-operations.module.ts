/** Trusted deployment composition; never imported by AppModule. */
import { Global, Module } from '@nestjs/common';
import { ConfigurationModule } from '@api/core/config';
import { PrismaModule } from '@api/core/database';
import { AuditModule } from '@api/core/audit';
import { RedisModule } from '@api/core/cache';
import { PrismaPointRuleConfigurationReader } from '@api/modules/community-points/infrastructure';
import { PrismaAchievementRuleConfigurationReader } from '@api/modules/achievements/infrastructure';
import { GAMIFICATION_ACTIVATION_PREFLIGHT } from './infrastructure/activation-preflight.port';
import { ActivationPreflightAdapter } from './infrastructure/activation-preflight.adapter';
import { PrismaRuntimeOperations } from './infrastructure/prisma-runtime-operations';
import { GamificationRoutingModule } from './gamification-routing.module';
import {
  GAMIFICATION_WAKE_INVENTORY,
  type WakeInventory,
} from './contracts/runtime.types';

@Global()
@Module({
  imports: [
    ConfigurationModule,
    PrismaModule,
    AuditModule,
    RedisModule,
    GamificationRoutingModule,
  ],
  providers: [
    PrismaPointRuleConfigurationReader,
    PrismaAchievementRuleConfigurationReader,
    ActivationPreflightAdapter,
    PrismaRuntimeOperations,
    {
      provide: GAMIFICATION_ACTIVATION_PREFLIGHT,
      useExisting: ActivationPreflightAdapter,
    },
    {
      provide: GAMIFICATION_WAKE_INVENTORY,
      inject: [PrismaRuntimeOperations],
      useFactory: (operations: PrismaRuntimeOperations): WakeInventory =>
        Object.freeze({
          dueWakes: (...args: Parameters<WakeInventory['dueWakes']>) =>
            operations.dueWakes(...args),
        }),
    },
  ],
  exports: [
    PrismaRuntimeOperations,
    GAMIFICATION_ACTIVATION_PREFLIGHT,
    GAMIFICATION_WAKE_INVENTORY,
    GamificationRoutingModule,
  ],
})
export class GamificationOperationsModule {}
