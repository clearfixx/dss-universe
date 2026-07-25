/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media
 * 📄 File: apps/api/src/modules/media/application/services/media-library.service.ts
 *
 * 🎯 Purpose:
 * Provides authorized Mission Control browsing and storage metrics for Media.
 *
 * 🧠 Responsibilities:
 * • enforces Media Library permission inside application use cases;
 * • validates opaque cursor state;
 * • applies bounded filters through the Media repository;
 * • returns stable cursors without exposing storage paths.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';

import type { AuthenticatedUser } from '@api/core/auth';
import { Permission } from '@api/core/authorization';

import {
  MEDIA_REPOSITORY,
  type MediaRepository,
} from '../../domain/repositories/media.repository.interface';
import type { MediaLibraryQuery } from '../../domain/types/media-library-query.type';
import type { MediaEntity } from '../../domain/entities/media.entity';

export type BrowseMediaLibraryInput = Omit<
  MediaLibraryQuery,
  'first' | 'cursor'
> & {
  first?: number;
  after?: string;
};

export type MediaLibraryConnection = {
  items: MediaEntity[];
  hasNextPage: boolean;
  endCursor: string | null;
};

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

@Injectable()
export class MediaLibraryService {
  constructor(
    @Inject(MEDIA_REPOSITORY)
    private readonly media: MediaRepository,
  ) {}

  async browse(
    actor: AuthenticatedUser,
    input: BrowseMediaLibraryInput = {},
  ): Promise<MediaLibraryConnection> {
    this.assertCanRead(actor);
    const first = Math.min(
      Math.max(Math.trunc(input.first ?? DEFAULT_PAGE_SIZE), 1),
      MAX_PAGE_SIZE,
    );
    const { after, ...filters } = input;
    const page = await this.media.browseLibrary({
      ...filters,
      first,
      ...(after ? { cursor: this.decodeCursor(after) } : {}),
      search: filters.search?.trim() || undefined,
    });
    const last = page.items.at(-1);
    return {
      ...page,
      endCursor: last ? this.encodeCursor(last) : null,
    };
  }

  metrics(actor: AuthenticatedUser) {
    this.assertCanRead(actor);
    return this.media.getLibraryMetrics();
  }

  private assertCanRead(actor: AuthenticatedUser): void {
    if (!actor.permissions.includes(Permission.MediaLibraryRead)) {
      throw new ForbiddenException('Media Library permission is required.');
    }
  }

  private encodeCursor(media: MediaEntity): string {
    return Buffer.from(
      JSON.stringify({
        createdAt: media.createdAt.toISOString(),
        id: media.id,
      }),
      'utf8',
    ).toString('base64url');
  }

  private decodeCursor(cursor: string): { createdAt: Date; id: string } {
    try {
      const value = JSON.parse(
        Buffer.from(cursor, 'base64url').toString('utf8'),
      ) as unknown;
      if (
        typeof value !== 'object' ||
        value === null ||
        !('createdAt' in value) ||
        !('id' in value) ||
        typeof value.createdAt !== 'string' ||
        typeof value.id !== 'string' ||
        value.id.length === 0
      ) {
        throw new Error('Invalid cursor shape.');
      }
      const createdAt = new Date(value.createdAt);
      if (Number.isNaN(createdAt.getTime())) {
        throw new Error('Invalid cursor date.');
      }
      return { createdAt, id: value.id };
    } catch {
      throw new BadRequestException('Invalid Media Library cursor.');
    }
  }
}
