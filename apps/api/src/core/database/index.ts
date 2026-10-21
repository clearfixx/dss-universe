/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Core Database
 * 📄 File: apps/api/src/core/database/index.ts
 *
 * 🎯 Purpose:
 * Publishes explicit technical persistence, pagination and error contracts.
 *
 * ⚠️ Important:
 * Technical ORM APIs do not authorize persistence access from feature business code.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export { PrismaModule } from './prisma.module';

export { PrismaService } from './services/prisma.service';

export {
  getPagination,
  createPaginatedResult,
  type PaginationParams,
  type PaginationMeta,
  type PaginationQuery,
  type PaginatedResult,
  type DatabasePaginationParams,
  type DatabasePaginationQuery,
} from './pagination';

export type { TransactionClient } from './transactions';

export {
  DatabaseException,
  isPrismaKnownRequestError,
  mapPrismaError,
  PrismaExceptionFilter,
} from './exceptions';

export { PRISMA_CLIENT_OPTIONS } from './constants/database.constants';
