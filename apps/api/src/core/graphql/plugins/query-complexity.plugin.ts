/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Core GraphQL
 * 📄 File: apps/api/src/core/graphql/plugins/query-complexity.plugin.ts
 *
 * 🎯 Purpose:
 * Enforces request-aware GraphQL query complexity limits.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type { ApolloServerPlugin, BaseContext } from '@apollo/server';
import { GraphQLError } from 'graphql';
import {
  fieldExtensionsEstimator,
  getComplexity,
  simpleEstimator,
} from 'graphql-query-complexity';

export function createQueryComplexityPlugin(
  maximumComplexity: number,
): ApolloServerPlugin<BaseContext> {
  return {
    // Apollo's plugin contract requires a Promise-returning hook.
    // eslint-disable-next-line @typescript-eslint/require-await
    async requestDidStart() {
      return {
        // Apollo's listener contract is asynchronous even though this check is CPU-only.
        // eslint-disable-next-line @typescript-eslint/require-await
        async didResolveOperation(requestContext) {
          const complexity = getComplexity({
            schema: requestContext.schema,
            query: requestContext.document,
            operationName: requestContext.request.operationName,
            variables: requestContext.request.variables,
            estimators: [
              fieldExtensionsEstimator(),
              simpleEstimator({ defaultComplexity: 1 }),
            ],
          });

          if (complexity > maximumComplexity) {
            throw new GraphQLError(
              `Query complexity ${complexity} exceeds the maximum of ${maximumComplexity}.`,
              {
                extensions: {
                  code: 'QUERY_TOO_COMPLEX',
                  complexity,
                  maximumComplexity,
                  http: { status: 400 },
                },
              },
            );
          }
        },
      };
    },
  };
}
