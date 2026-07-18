/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: API Bootstrap
 * 📄 File: apps/api/src/main.ts
 *
 * 🎯 Purpose:
 * Boots the DSS Universe API application and configures global
 * runtime behavior before the server starts accepting requests.
 *
 * 🧠 Responsibilities:
 * • creates the NestJS application;
 * • applies the global API prefix;
 * • enables graceful shutdown hooks;
 * • configures global request validation.
 *
 * 🏗️ Architecture:
 * Application bootstrap.
 * This file wires platform-level behavior, not feature logic.
 *
 * ⚠️ Important:
 * Keep business logic out of bootstrap.
 * Global validation rules affect every HTTP endpoint.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from '@api/app.module';

import { setupSwagger } from './core/swagger/swagger.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  const allowedOrigins = (process.env.WEB_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidUnknownValues: true,
    }),
  );

  app.enableShutdownHooks();

  /**
   * Swagger lives in core infrastructure.
   * API docs: /api/docs
   */
  setupSwagger(app);

  await app.listen(process.env.PORT ?? 4000);
}

bootstrap().catch((error) => {
  console.error('Failed to start DSS Universe API');
  console.error(error);

  process.exit(1);
});

/**
 * -----------------------------------------------------------------------------
 * 🛰️ Bootstrap opens the station doors.
 * Validation makes sure guests do not bring cosmic junk inside.
 * -----------------------------------------------------------------------------
 */
