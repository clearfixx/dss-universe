/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Core GraphQL Tests
 * 📄 File: apps/api/src/core/graphql/errors/graphql-error.formatter.spec.ts
 *
 * 🎯 Purpose:
 * Verifies stable public GraphQL error codes and production redaction.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type { GraphQLFormattedError } from 'graphql';

import { formatGraphqlError } from './graphql-error.formatter';

describe('formatGraphqlError', () => {
  const nodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = nodeEnv;
  });

  it('maps HTTP status codes to stable GraphQL codes', () => {
    const error: GraphQLFormattedError = {
      message: 'Unauthorized',
      extensions: {
        originalError: { message: 'Authentication required', statusCode: 401 },
      },
    };

    expect(formatGraphqlError(error)).toMatchObject({
      message: 'Authentication required',
      extensions: { code: 'UNAUTHENTICATED', statusCode: 401 },
    });
  });

  it('redacts internal errors in production', () => {
    process.env.NODE_ENV = 'production';

    expect(
      formatGraphqlError({
        message: 'database connection details',
        extensions: { code: 'INTERNAL_SERVER_ERROR' },
      }),
    ).toMatchObject({
      message: 'An unexpected error occurred.',
      extensions: { code: 'INTERNAL_SERVER_ERROR' },
    });
  });
});
