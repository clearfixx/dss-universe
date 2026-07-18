/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media
 * 📄 File: apps/api/src/modules/media/presentation/graphql/models/media-upload-session.model.ts
 *
 * 🎯 Purpose:
 * Defines the owner-visible GraphQL projection of an upload session.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Field, GraphQLISODateTime, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('MediaUploadSession')
export class MediaUploadSessionModel {
  @Field()
  id!: string;

  @Field()
  policyKey!: string;

  @Field()
  status!: string;

  @Field()
  originalFilename!: string;

  @Field()
  declaredMimeType!: string;

  @Field(() => Int)
  declaredSize!: number;

  @Field(() => String, { nullable: true })
  checksum!: string | null;

  @Field(() => GraphQLISODateTime)
  expiresAt!: Date;

  @Field(() => GraphQLISODateTime, { nullable: true })
  completedAt!: Date | null;

  @Field(() => GraphQLISODateTime)
  createdAt!: Date;
}
