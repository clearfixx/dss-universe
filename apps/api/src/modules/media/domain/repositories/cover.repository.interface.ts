/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media
 * 📄 File: apps/api/src/modules/media/domain/repositories/cover.repository.interface.ts
 *
 * 🎯 Purpose:
 * Defines atomic persistence operations for user profile cover references.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type { CoverMediaCandidate } from '../types/cover-media-candidate.type';

export const COVER_REPOSITORY = Symbol('COVER_REPOSITORY');

export type CoverAssignment = {
  userId: string;
  mediaId: string;
  coverUrl: string;
  actorId: string;
};

export interface CoverRepository {
  findCandidate(mediaId: string): Promise<CoverMediaCandidate | null>;
  assign(input: CoverAssignment): Promise<void>;
  remove(userId: string, actorId: string): Promise<void>;
}
