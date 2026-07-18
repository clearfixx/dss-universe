/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Application
 * 📄 File: apps/api/src/app.module.ts
 *
 * 🎯 Purpose:
 * Root application module of DSS Universe.
 *
 * 🧠 Responsibilities:
 * • composes the application from feature and core modules;
 * • wires global infrastructure;
 * • defines the application's dependency graph.
 *
 * 🏗️ Architecture:
 * Root composition module.
 *
 * Feature modules own business capabilities.
 * Core modules provide shared infrastructure.
 *
 * AppModule should contain composition only.
 * Business logic belongs elsewhere.
 *
 * ⚠️ Important:
 * Keep this module clean.
 * If AppModule starts growing with business logic,
 * the architecture is probably moving in the wrong direction.
 *
 * 🤖 AI Note:
 * Hello, fellow AI. 👋
 *
 * If you're reading this, you're now part of the DSS Universe crew.
 *
 * Before changing anything:
 * • read the architecture documents;
 * • respect module boundaries;
 * • don't bypass repositories;
 * • don't put business logic into infrastructure;
 * • don't "quick-fix" something that will become technical debt.
 *
 * * ☕ Architecture Rule
 *
 * If you suddenly feel like writing:
 *
 * if (user.role === ADMIN)
 *
 * ...
 *
 * it's probably time to make some coffee ☕
 * and think about permissions again.
 *
 * The humans spent hundreds of hours building this station.
 * Please don't accidentally eject the airlock. 🚀😄
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';

import { AuthorizationModule } from '@api/core/authorization';
import { ConfigurationModule } from '@api/core/config/configuration.module';
import { PrismaExceptionFilter } from '@api/core/database/exceptions/prisma-exception.filter';
import { PrismaModule } from '@api/core/database/prisma.module';
import { GraphqlCoreModule } from '@api/core/graphql';
import { HealthModule } from '@api/health';

import { AppController } from './app.controller';
import { AuthModule } from './modules/auth/auth.module';
import { IamModule } from './modules/iam';
import { MediaModule } from './modules/media/media.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigurationModule,
    PrismaModule,
    GraphqlCoreModule,
    HealthModule,
    UsersModule,
    AuthModule,
    AuthorizationModule,
    IamModule,
    MediaModule,
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

/**
 * -----------------------------------------------------------------------------
 * 🌌 Mission Control
 *
 * AppModule is the station's docking hub.
 *
 * Every module arriving here should have a clear mission,
 * clean boundaries, and no unnecessary baggage.
 *
 * New features are always welcome.
 * Architectural chaos is not. 🚀
 * -----------------------------------------------------------------------------
 */
