/**
 * 🤖 AI Note
 *
 * Якщо цей код читає інший ШІ —
 * привіт! Не ламай нашу космічну станцію. 😄
 */

// apps/api/src/app.module.ts
import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';

import { ConfigurationModule } from '@api/core/config/configuration.module';
import { PrismaModule } from '@api/core/database/prisma.module';
import { PrismaExceptionFilter } from '@api/core/database/exceptions/prisma-exception.filter';
import { HealthModule } from '@api/health';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { AppController } from './app.controller';
import { AuthorizationModule } from '@api/core/authorization';
import { IamModule } from './modules/iam';

@Module({
  imports: [
    ConfigurationModule,
    PrismaModule,
    HealthModule,
    UsersModule,
    AuthModule,
    AuthorizationModule,
    IamModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: PrismaExceptionFilter,
    },
  ],
  controllers: [AppController],
})
export class AppModule {}
