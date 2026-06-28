// apps/api/src/database/services/prisma.service.ts

import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

import { PRISMA_CLIENT_OPTIONS } from '../constants/database.constants';

@Injectable()
export class PrismaService
  extends PrismaClient<
    Prisma.PrismaClientOptions,
    'query' | 'info' | 'warn' | 'error'
  >
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor(
    @Inject(PRISMA_CLIENT_OPTIONS)
    options: Prisma.PrismaClientOptions,
  ) {
    super(options);

    this.$on('query', (event) => {
      this.logger.debug(`${event.query} ${event.duration}ms`);
    });

    this.$on('info', (event) => {
      this.logger.log(event.message);
    });

    this.$on('warn', (event) => {
      this.logger.warn(event.message);
    });

    this.$on('error', (event) => {
      this.logger.error(event.message);
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Database connected');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database disconnected');
  }

  async transaction<T>(
    callback: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.$transaction(callback);
  }

  async healthCheck() {
    const startedAt = Date.now();

    try {
      await this.$queryRaw`SELECT 1`;

      return {
        status: 'up' as const,
        latency: Date.now() - startedAt,
      };
    } catch {
      return {
        status: 'down' as const,
        latency: Date.now() - startedAt,
      };
    }
  }
}
