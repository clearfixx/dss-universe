/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Core GraphQL
 * 📄 File: apps/api/src/core/graphql/resolvers/system.resolver.ts
 *
 * 🎯 Purpose:
 * Exposes a minimal transport status query used by clients and smoke tests.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Query, Resolver } from '@nestjs/graphql';
import { ApiInfo } from '../types/api-info.model';

@Resolver()
export class SystemResolver {
  @Query(() => ApiInfo)
  apiInfo(): ApiInfo {
    return {
      name: 'DSS Universe API',
      status: 'ok',
      transport: 'graphql',
    };
  }
}
