/**
 * -----------------------------------------------------------------------------
 * File: apps/api/src/core/database/index.ts
 * -----------------------------------------------------------------------------
 *
 * DSS Universe
 * Core Database Public API
 *
 * Exposes Prisma infrastructure, transaction helpers, database exceptions,
 * and database-level pagination helpers.
 *
 * -----------------------------------------------------------------------------
 */

export * from './prisma.module';

export * from './services/prisma.service';

export * from './pagination';

export * from './transactions';

export * from './exceptions';

export * from './constants/database.constants';
