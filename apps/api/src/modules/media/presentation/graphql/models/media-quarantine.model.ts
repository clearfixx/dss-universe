/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media
 * 📄 File: apps/api/src/modules/media/presentation/graphql/models/media-quarantine.model.ts
 *
 * 🎯 Purpose:
 * Defines the administrative GraphQL view of a quarantined Media record.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import {
  Field,
  GraphQLISODateTime,
  ID,
  Int,
  ObjectType,
} from '@nestjs/graphql';

@ObjectType('MediaQuarantineItem')
export class MediaQuarantineModel {
  @Field(() => ID)
  id!: string;

  @Field(() => ID, { nullable: true })
  ownerId!: string | null;

  @Field()
  originalFilename!: string;

  @Field()
  mimeType!: string;

  @Field(() => Int)
  size!: number;

  @Field()
  status!: string;

  @Field(() => String, { nullable: true })
  failureCode!: string | null;

  @Field(() => String, { nullable: true })
  failureReason!: string | null;

  @Field(() => GraphQLISODateTime)
  createdAt!: Date;

  @Field(() => GraphQLISODateTime)
  updatedAt!: Date;
}
