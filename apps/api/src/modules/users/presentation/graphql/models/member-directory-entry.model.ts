/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/presentation/graphql/models/member-directory-entry.model.ts
 *
 * 🎯 Purpose:
 * Defines the privacy-safe member card returned by the members directory.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType('MemberDirectoryEntry')
export class MemberDirectoryEntryModel {
  @Field(() => ID)
  id!: string;

  @Field()
  username!: string;

  @Field(() => String, { nullable: true })
  displayName!: string | null;

  @Field(() => String, { nullable: true })
  avatarUrl!: string | null;

  @Field()
  createdAt!: string;
}
