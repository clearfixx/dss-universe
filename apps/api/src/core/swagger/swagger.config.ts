/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Core Swagger
 * 📄 File: apps/api/src/core/swagger/swagger.config.ts
 *
 * 🎯 Purpose:
 * Configures OpenAPI / Swagger documentation for the DSS Universe API.
 *
 * 🧠 Responsibilities:
 * • creates the OpenAPI document;
 * • configures JWT Bearer authentication for API docs;
 * • exposes Swagger UI under /api/docs;
 * • keeps Swagger setup centralized in core infrastructure.
 *
 * 🏗️ Architecture:
 * Core infrastructure.
 * This file must not contain feature logic or module-specific rules.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

const SWAGGER_PATH = 'api/docs';
const SWAGGER_AUTH_NAME = 'access-token';

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('DSS Universe API')
    .setDescription('Developer Space Station backend API documentation.')
    .setVersion('0.1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Paste JWT access token here.',
      },
      SWAGGER_AUTH_NAME,
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup(SWAGGER_PATH, app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
}

/**
 * -----------------------------------------------------------------------------
 * 📘 Swagger is the API map.
 * If the endpoint exists but docs do not, the station crew gets lost.
 * -----------------------------------------------------------------------------
 */
