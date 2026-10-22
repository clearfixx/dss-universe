/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Core GraphQL
 * 📄 File: apps/api/src/core/graphql/types/api-info.model.ts
 * 🎯 Purpose: Defines the existing API status transport projection.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class ApiInfo {
  @Field()
  name!: string;

  @Field()
  status!: string;

  @Field()
  transport!: string;
}
