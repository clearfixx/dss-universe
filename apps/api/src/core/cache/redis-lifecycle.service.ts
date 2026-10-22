/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Core Cache
 * 📄 File: apps/api/src/core/cache/redis-lifecycle.service.ts
 * 🎯 Purpose: Owns connection initialization and shutdown without changing Redis policy.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import {
  Inject,
  Injectable,
  type OnApplicationShutdown,
  type OnModuleInit,
} from '@nestjs/common';
import type IORedis from 'ioredis';
import { REDIS_CONNECTION } from './redis.constants';

@Injectable()
export class RedisLifecycleService
  implements OnModuleInit, OnApplicationShutdown
{
  constructor(@Inject(REDIS_CONNECTION) private readonly connection: IORedis) {}
  async onModuleInit(): Promise<void> {
    if (this.connection.status === 'wait') await this.connection.connect();
  }
  async onApplicationShutdown(): Promise<void> {
    if (this.connection.status !== 'end') await this.connection.quit();
  }
}
