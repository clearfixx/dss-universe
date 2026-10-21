import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

import { PRISMA_CLIENT_OPTIONS } from '../constants/database.constants';

export const prismaClientOptionsProvider: Provider = {
  provide: PRISMA_CLIENT_OPTIONS,
  inject: [ConfigService],
  useFactory: (configService: ConfigService): Prisma.PrismaClientOptions => {
    const databaseUrl = configService.getOrThrow<string>('DATABASE_URL');
    const isDev = configService.get<string>('NODE_ENV') !== 'production';

    const adapter = new PrismaPg({
      connectionString: databaseUrl,
    });

    return {
      adapter,
      log: isDev
        ? [
            { emit: 'event', level: 'query' },
            { emit: 'event', level: 'info' },
            { emit: 'event', level: 'warn' },
            { emit: 'event', level: 'error' },
          ]
        : ['error'],
    };
  },
};
