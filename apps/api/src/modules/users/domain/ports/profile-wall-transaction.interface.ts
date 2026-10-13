/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/domain/ports/profile-wall-transaction.interface.ts
 *
 * 🎯 Purpose:
 * Defines atomic Profile Wall writes and their bounded stored result.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { CreateUserWallPost } from '../types/user-wall-post.type';
export type ProfileWallWriteResult = {
  id: string;
  interactionTargetId: string;
  profileOwnerId: string;
  authorId: string;
  body: string | null;
  imageMediaId: string | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};
export interface ProfileWallTransaction {
  create(input: CreateUserWallPost): Promise<ProfileWallWriteResult>;
  tombstone(
    postId: string,
    actorId: string,
    reason: string | null,
  ): Promise<ProfileWallWriteResult>;
}
export const PROFILE_WALL_TRANSACTION = Symbol('PROFILE_WALL_TRANSACTION');
export type { CreateUserWallPost } from '../types/user-wall-post.type';
