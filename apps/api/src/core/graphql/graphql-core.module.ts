/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Core GraphQL
 * 📄 File: apps/api/src/core/graphql/graphql-core.module.ts
 *
 * 🎯 Purpose:
 * Configures the application-wide Apollo GraphQL transport.
 *
 * 🧠 Responsibilities:
 * • generates a deterministic code-first schema;
 * • creates the request context used by guards and resolvers;
 * • enforces query depth and complexity limits;
 * • formats public errors without leaking internals.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { ApolloDriver, type ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { join } from 'node:path';
import depthLimit from 'graphql-depth-limit';

import { formatGraphqlError } from './errors/graphql-error.formatter';
import { createQueryComplexityPlugin } from './plugins/query-complexity.plugin';
import { SystemResolver } from './resolvers/system.resolver';
import type { GraphqlContext } from './types/graphql-context.type';

const MAX_QUERY_DEPTH = 10;
const MAX_QUERY_COMPLEXITY = 250;

@Module({
  imports: [
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      inject: [ConfigService],
      useFactory: (config: ConfigService): ApolloDriverConfig => {
        const isProduction = config.get<string>('NODE_ENV') === 'production';

        return {
          driver: ApolloDriver,
          path: '/api/graphql',
          autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
          sortSchema: true,
          introspection: !isProduction,
          graphiql: !isProduction,
          context: ({ req, res }: GraphqlContext): GraphqlContext => ({
            req,
            res,
          }),
          formatError: formatGraphqlError,
          plugins: [createQueryComplexityPlugin(MAX_QUERY_COMPLEXITY)],
          validationRules: [
            // graphql-depth-limit does not publish strict ESLint-compatible types.
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            depthLimit(MAX_QUERY_DEPTH),
          ],
        };
      },
    }),
  ],
  providers: [SystemResolver],
})
export class GraphqlCoreModule {}
