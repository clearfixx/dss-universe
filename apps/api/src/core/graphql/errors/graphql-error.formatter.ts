/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Core GraphQL
 * 📄 File: apps/api/src/core/graphql/errors/graphql-error.formatter.ts
 *
 * 🎯 Purpose:
 * Produces stable GraphQL errors without leaking internal implementation details.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type { GraphQLFormattedError } from 'graphql';

type OriginalError = {
  message?: string;
  statusCode?: number;
};

const STATUS_CODES: Record<number, string> = {
  400: 'BAD_USER_INPUT',
  401: 'UNAUTHENTICATED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  429: 'RATE_LIMITED',
};

export function formatGraphqlError(
  error: GraphQLFormattedError,
): GraphQLFormattedError {
  const original = error.extensions?.originalError as OriginalError | undefined;
  const statusCode = original?.statusCode;
  const code =
    (statusCode ? STATUS_CODES[statusCode] : undefined) ??
    (typeof error.extensions?.code === 'string'
      ? error.extensions.code
      : 'INTERNAL_SERVER_ERROR');
  const isInternal = code === 'INTERNAL_SERVER_ERROR';

  return {
    message:
      isInternal && process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred.'
        : (original?.message ?? error.message),
    locations: error.locations,
    path: error.path,
    extensions: {
      code,
      ...(statusCode ? { statusCode } : {}),
    },
  };
}
