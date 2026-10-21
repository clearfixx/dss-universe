/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Core Configuration
 * 📄 File: apps/api/src/core/config/index.ts
 *
 * 🎯 Purpose:
 * Publishes existing configuration symbols without owning loader initialization.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export {
  configs,
  appConfig,
  databaseConfig,
  jwtConfig,
  mailConfig,
  openaiConfig,
  redisConfig,
} from './config-loaders';

export { ConfigurationModule } from './configuration.module';
export { validationSchema } from './validation.schema';
