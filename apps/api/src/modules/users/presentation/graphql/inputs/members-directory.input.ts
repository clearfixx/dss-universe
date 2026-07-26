/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/presentation/graphql/inputs/members-directory.input.ts
 *
 * 🎯 Purpose:
 * Defines bounded search, sorting and pagination input for the public
 * members directory.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Field, InputType, registerEnumType } from '@nestjs/graphql';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

import { UsersPageInput } from './users-page.input';

export enum MembersDirectorySortInput {
  NEWEST = 'NEWEST',
  OLDEST = 'OLDEST',
  USERNAME_ASC = 'USERNAME_ASC',
  USERNAME_DESC = 'USERNAME_DESC',
  LAST_ACTIVE = 'LAST_ACTIVE',
}

registerEnumType(MembersDirectorySortInput, {
  name: 'MembersDirectorySort',
});

@InputType()
export class MembersDirectoryInput extends UsersPageInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  search?: string;

  @Field(() => MembersDirectorySortInput, {
    defaultValue: MembersDirectorySortInput.NEWEST,
  })
  @IsEnum(MembersDirectorySortInput)
  sort = MembersDirectorySortInput.NEWEST;
}
