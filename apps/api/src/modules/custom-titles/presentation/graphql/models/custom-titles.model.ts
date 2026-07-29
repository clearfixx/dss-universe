/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Custom Titles
 * 📄 File: apps/api/src/modules/custom-titles/presentation/graphql/models/custom-titles.model.ts
 *
 * 🎯 Purpose:
 * Defines GraphQL representations for title definitions, grants, and policy.
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

@ObjectType('CustomTitle')
export class CustomTitleModel {
  @Field(() => ID)
  id!: string;

  @Field()
  name!: string;

  @Field()
  slug!: string;

  @Field(() => String, { nullable: true })
  description!: string | null;

  @Field()
  color!: string;

  @Field()
  badge!: string;

  @Field()
  isActive!: boolean;

  @Field(() => GraphQLISODateTime)
  createdAt!: Date;

  @Field(() => GraphQLISODateTime)
  updatedAt!: Date;
}

@ObjectType('UserTitleGrant')
export class UserTitleGrantModel {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  userId!: string;

  @Field(() => ID)
  titleId!: string;

  @Field(() => ID)
  grantedById!: string;

  @Field()
  grantReason!: string;

  @Field(() => GraphQLISODateTime)
  grantedAt!: Date;

  @Field(() => GraphQLISODateTime, { nullable: true })
  revokedAt!: Date | null;

  @Field(() => ID, { nullable: true })
  revokedById!: string | null;

  @Field(() => String, { nullable: true })
  revokeReason!: string | null;

  @Field(() => CustomTitleModel)
  title!: CustomTitleModel;

  @Field()
  selected!: boolean;
}

@ObjectType('CustomTitleSettings')
export class CustomTitleSettingsModel {
  @Field(() => Int)
  selectionCooldownDays!: number;

  @Field(() => ID, { nullable: true })
  updatedById!: string | null;

  @Field(() => GraphQLISODateTime)
  updatedAt!: Date;
}

/**
 * GraphQL exposes the badge and its history, never a hidden capability.
 */
