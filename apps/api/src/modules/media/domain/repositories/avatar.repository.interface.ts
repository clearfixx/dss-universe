/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media
 * 📄 File: apps/api/src/modules/media/domain/repositories/avatar.repository.interface.ts
 *
 * 🎯 Purpose:
 * Defines atomic persistence operations for user avatar references.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type { AvatarMediaCandidate } from '../types/avatar-media-candidate.type';

export const AVATAR_REPOSITORY = Symbol('AVATAR_REPOSITORY');

export type AvatarAssignment = {
  userId: string;
  mediaId: string;
  avatarUrl: string;
  actorId: string;
};

export interface AvatarRepository {
  findCandidate(mediaId: string): Promise<AvatarMediaCandidate | null>;
  assign(input: AvatarAssignment): Promise<void>;
  remove(userId: string, actorId: string): Promise<void>;
}
