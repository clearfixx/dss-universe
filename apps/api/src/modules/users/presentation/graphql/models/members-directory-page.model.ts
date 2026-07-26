/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/presentation/graphql/models/members-directory-page.model.ts
 *
 * 🎯 Purpose:
 * Defines a paginated GraphQL response for the members directory.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Field, Int, ObjectType } from '@nestjs/graphql';

import { MemberDirectoryEntryModel } from './member-directory-entry.model';

@ObjectType('MembersDirectoryPage')
export class MembersDirectoryPageModel {
  @Field(() => [MemberDirectoryEntryModel])
  items!: MemberDirectoryEntryModel[];

  @Field(() => Int)
  total!: number;

  @Field(() => Int)
  page!: number;

  @Field(() => Int)
  limit!: number;

  @Field(() => Int)
  totalPages!: number;
}
