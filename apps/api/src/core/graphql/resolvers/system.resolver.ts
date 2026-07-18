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

import { Field, ObjectType, Query, Resolver } from '@nestjs/graphql';

@ObjectType()
class ApiInfo {
  @Field()
  name!: string;

  @Field()
  status!: string;

  @Field()
  transport!: string;
}

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
