/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/presentation/graphql/models/user.model.ts
 *
 * 🎯 Purpose:
 * Defines the public GraphQL user contract without private account fields.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { UserSocialLinkModel } from './user-social-link.model';

@ObjectType('User')
export class UserModel {
  @Field(() => ID)
  id!: string;

  @Field()
  username!: string;

  @Field(() => String, { nullable: true })
  displayName!: string | null;

  @Field(() => String, { nullable: true })
  bio!: string | null;

  @Field(() => String, { nullable: true })
  location!: string | null;

  @Field(() => String, { nullable: true })
  website!: string | null;

  @Field(() => [String])
  technologies!: string[];

  @Field(() => [String])
  interests!: string[];

  @Field(() => [UserSocialLinkModel])
  socialLinks!: UserSocialLinkModel[];

  @Field(() => String, { nullable: true })
  avatarUrl!: string | null;

  @Field(() => String, { nullable: true })
  coverUrl!: string | null;

  @Field(() => Int)
  followerCount!: number;

  @Field(() => Int)
  followingCount!: number;

  @Field()
  isFollowedByViewer!: boolean;

  @Field()
  isOnline!: boolean;

  @Field()
  status!: string;

  @Field(() => String, { nullable: true })
  lastSeenAt!: string | null;

  @Field()
  createdAt!: string;
}
