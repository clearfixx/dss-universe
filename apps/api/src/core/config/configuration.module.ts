/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Core Configuration
 * 📄 File: apps/api/src/core/config/configuration.module.ts
 *
 * 🎯 Purpose:
 * Registers validated environment configuration for the application composition.
 *
 * 🧠 Responsibilities:
 * • loads the existing ordered configuration namespaces;
 * • preserves environment-file precedence and validation policy.
 *
 * 🏗️ Architecture:
 * Core Nest assembly; consumes loaders directly, not through its own barrel.
 *
 * ⚠️ Important:
 * Keep registration options unchanged; this module owns no business policy.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { configs } from '@api/core/config/config-loaders';
import { validationSchema } from '@api/core/config/validation.schema';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: configs,
      validationSchema,
      envFilePath: ['.env.local', '.env'],
      expandVariables: true,
    }),
  ],
})
export class ConfigurationModule {}
