/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Core Configuration
 * 📄 File: apps/api/src/core/config/index.ts
 *
 * 🎯 Purpose:
 * Preserves ordered namespace registration and publishes existing config symbols explicitly.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import appConfig from './namespaces/app.config';
import databaseConfig from './namespaces/database.config';
import jwtConfig from './namespaces/jwt.config';
import mailConfig from './namespaces/mail.config';
import openaiConfig from './namespaces/openai.config';
import redisConfig from './namespaces/redis.config';

export const configs = [
  appConfig,
  databaseConfig,
  jwtConfig,
  mailConfig,
  openaiConfig,
  redisConfig,
];

export {
  appConfig,
  databaseConfig,
  jwtConfig,
  mailConfig,
  openaiConfig,
  redisConfig,
};

export { ConfigurationModule } from './configuration.module';
export { validationSchema } from './validation.schema';
