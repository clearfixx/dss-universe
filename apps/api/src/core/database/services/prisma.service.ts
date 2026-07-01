/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Database
 * 📄 File: apps/api/src/core/database/services/prisma.service.ts
 *
 * 🎯 Purpose:
 * Provides the application-wide Prisma client service and database
 * lifecycle integration for the API.
 *
 * 🧠 Responsibilities:
 * • connects Prisma during module initialization;
 * • disconnects Prisma during module shutdown;
 * • exposes transaction and health-check helpers;
 * • logs Prisma query, info, warning, and error events.
 *
 * 🏗️ Architecture:
 * Core database infrastructure service.
 * Feature modules should depend on this service through repositories,
 * not use Prisma directly from application code.
 *
 * ⚠️ Important:
 * Do not place feature-specific persistence logic here.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

import { PRISMA_CLIENT_OPTIONS } from '../constants/database.constants';
import type { TransactionClient } from '../transactions';

type DatabaseHealthCheckResult = {
  status: 'up' | 'down';
  latency: number;
};

@Injectable()
export class PrismaService
  extends PrismaClient<
    Prisma.PrismaClientOptions,
    'query' | 'info' | 'warn' | 'error'
  >
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  public constructor(
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

  public async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Database connected');
  }

  public async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('Database disconnected');
  }

  public async transaction<T>(
    callback: (tx: TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.$transaction(callback);
  }

  public async healthCheck(): Promise<DatabaseHealthCheckResult> {
    const startedAt = Date.now();

    try {
      await this.$queryRaw`SELECT 1`;

      return {
        status: 'up',
        latency: Date.now() - startedAt,
      };
    } catch {
      return {
        status: 'down',
        latency: Date.now() - startedAt,
      };
    }
  }
}
