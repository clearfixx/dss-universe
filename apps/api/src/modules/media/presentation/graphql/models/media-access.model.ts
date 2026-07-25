/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media
 * 📄 File: apps/api/src/modules/media/presentation/graphql/models/media-access.model.ts
 *
 * 🎯 Purpose:
 * Defines the GraphQL response for short-lived media access.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Field, GraphQLISODateTime, ObjectType } from '@nestjs/graphql';

@ObjectType('MediaAccess')
export class MediaAccessModel {
  @Field()
  url!: string;

  @Field(() => GraphQLISODateTime)
  expiresAt!: Date;
}
