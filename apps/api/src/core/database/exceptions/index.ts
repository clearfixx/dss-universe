/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Core Database Exceptions
 * 📄 File: apps/api/src/core/database/exceptions/index.ts
 *
 * 🎯 Purpose:
 * Exposes existing error mapping and transport filtering by explicit name.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export { DatabaseException } from './database.exception';
export {
  isPrismaKnownRequestError,
  mapPrismaError,
} from './prisma-error.mapper';
export { PrismaExceptionFilter } from './prisma-exception.filter';
