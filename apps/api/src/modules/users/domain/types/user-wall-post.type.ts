/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/domain/types/user-wall-post.type.ts
 *
 * 🎯 Purpose:
 * Defines privacy-safe Profile Wall records independently from Prisma.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export type UserWallPost = {
  id: string;
  interactionTargetId: string;
  profileOwnerId: string;
  authorId: string;
  body: string | null;
  imageMediaId: string | null;
  isDeleted: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateUserWallPost = {
  profileOwnerId: string;
  authorId: string;
  body: string | null;
  imageMediaId: string | null;
};

/**
 * A wall post may disappear from view, but its audit trail never gets lost
 * behind the sofa.
 */
