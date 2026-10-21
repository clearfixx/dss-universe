import {
  Global,
  Inject,
  Injectable,
  Module,
  type OnApplicationShutdown,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import IORedis from 'ioredis';
import { REDIS_CONNECTION } from './redis.constants';

@Injectable()
class RedisLifecycleService implements OnModuleInit, OnApplicationShutdown {
  constructor(@Inject(REDIS_CONNECTION) private readonly connection: IORedis) {}
  async onModuleInit(): Promise<void> {
    if (this.connection.status === 'wait') await this.connection.connect();
  }
  async onApplicationShutdown(): Promise<void> {
    if (this.connection.status !== 'end') await this.connection.quit();
  }
}

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CONNECTION,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new IORedis({
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
          lazyConnect: true,
          maxRetriesPerRequest: null,
        }),
    },
    RedisLifecycleService,
  ],
  exports: [REDIS_CONNECTION],
})
export class RedisModule {}
