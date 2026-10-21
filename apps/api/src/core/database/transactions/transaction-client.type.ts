/**
 * 📄 File: apps/api/src/core/database/transactions/transaction-client.type.ts
 *
 * Prisma transaction client alias.
 *
 * Keeps transaction typing centralized, so repositories do not import
 * Prisma transaction internals directly all over the station. 🛰️
 */

import { Prisma } from '@prisma/client';

export type TransactionClient = Prisma.TransactionClient;
