import { Injectable } from '@nestjs/common';
import { PrismaService } from '@api/core/database';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async check() {
    const database = await this.prisma.healthCheck();

    return {
      app: 'DSS Universe API',
      status: database.status === 'up' ? 'ok' : 'error',
      database,
      time: new Date().toISOString(),
    };
  }
}


