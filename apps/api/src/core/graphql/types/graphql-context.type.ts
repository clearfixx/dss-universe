/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Core GraphQL
 * 📄 File: apps/api/src/core/graphql/types/graphql-context.type.ts
 *
 * 🎯 Purpose:
 * Defines the request context shared by GraphQL guards and resolvers.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type { Response } from 'express';

import type { AuthenticatedRequest } from '@api/core/auth';

export type GraphqlContext = {
  req: AuthenticatedRequest;
  res: Response;
};
