/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Forum (Community Hub)
 * 📄 File: apps/api/src/modules/forum/presentation/forum-shared.models.ts
 *
 * 🎯 Purpose:
 * GraphQL models shared by Forum resolvers without circular imports.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import {
  FORUM_STAFF_ROLES,
  type ForumStaffRole,
} from '../domain/types/forum-topic.type';

export const StaffRoleEnum = Object.fromEntries(
  FORUM_STAFF_ROLES.map((value) => [value, value]),
) as Record<ForumStaffRole, ForumStaffRole>;
registerEnumType(StaffRoleEnum, { name: 'ForumStaffRole' });

@ObjectType('ForumStaffNote')
export class ForumStaffNoteModel {
  @Field(() => ID) id!: string;
  @Field(() => ID) authorId!: string;
  @Field(() => StaffRoleEnum) role!: ForumStaffRole;
  @Field() body!: string;
  @Field() createdAt!: Date;
}
