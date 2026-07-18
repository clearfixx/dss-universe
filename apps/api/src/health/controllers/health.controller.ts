import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';

import { HealthService } from '../services/health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  check() {
    return this.healthService.check();
  }

  @Get('live')
  liveness() {
    return this.healthService.liveness();
  }

  @Get('ready')
  async readiness() {
    const result = await this.healthService.readiness();
    if (result.status !== 'ok') throw new ServiceUnavailableException(result);
    return result;
  }
}
