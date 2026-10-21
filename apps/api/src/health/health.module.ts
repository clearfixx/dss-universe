// apps/api/src/health/health.module.ts

import { Module } from '@nestjs/common';

import { HealthController } from './controllers/health.controller';
import { HealthService } from './services/health.service';

@Module({
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
