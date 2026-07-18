/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media
 * 📄 File: apps/api/src/modules/media/domain/repositories/media.repository.interface.ts
 *
 * 🎯 Purpose:
 * Defines the repository contract for media persistence.
 *
 * 🏗️ Architecture:
 * Domain repository contract.
 * Implementations belong to infrastructure.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { MediaEntity } from '../entities/media.entity';
import { CreateMediaInput } from '../types/create-media.input';
import { UpdateMediaInput } from '../types/update-media.input';

export const MEDIA_REPOSITORY = Symbol('MEDIA_REPOSITORY');

export interface MediaRepository {
  create(input: CreateMediaInput): Promise<MediaEntity>;
  findById(id: string): Promise<MediaEntity | null>;
  findByOwnerId(ownerId: string): Promise<MediaEntity[]>;
  update(id: string, input: UpdateMediaInput): Promise<MediaEntity>;
  softDelete(id: string): Promise<MediaEntity>;
  countActiveReferences(id: string): Promise<number>;
}
