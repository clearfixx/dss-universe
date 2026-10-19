/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Core Configuration
 * 📄 File: apps/api/src/core/config/config-loaders.ts
 *
 * 🎯 Purpose:
 * Owns the ordered namespace loaders independently of the public module entry.
 *
 * ⚠️ Important:
 * Preserve registration order; never import the configuration barrel here.
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
