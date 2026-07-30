/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Interaction Platform
 * 📄 File: apps/api/src/modules/interactions/infrastructure/repositories/prisma-bookmarks.repository.ts
 *
 * 🎯 Purpose:
 * Persists private bookmarks with idempotent Audit and Outbox evidence.
 *
 * 🧠 Responsibilities:
 * • serializes save/remove retries for one owner and target;
 * • enforces owner-scoped listing at the query boundary;
 * • records evidence only when bookmark state actually changes.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Injectable } from '@nestjs/common';

import { AuditWriterService } from '@api/core/audit';
import { PrismaService } from '@api/core/database';
import { createEventEnvelope, OutboxWriterService } from '@api/core/events';

import type { BookmarksRepository } from '../../domain/repositories/bookmarks.repository.interface';
import type {
  Bookmark,
  BookmarkMutationResult,
  BookmarkPage,
} from '../../domain/types/bookmark.type';

const PRODUCER = 'dss.api.bookmarks';

@Injectable()
export class PrismaBookmarksRepository implements BookmarksRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditWriterService,
    private readonly outbox: OutboxWriterService,
  ) {}

  async save(
    interactionTargetId: string,
    ownerId: string,
  ): Promise<BookmarkMutationResult> {
    return this.prisma.$transaction(async (transaction) => {
      await this.lockRelationship(transaction, interactionTargetId, ownerId);
      const existing = await transaction.bookmark.findUnique({
        where: {
          interactionTargetId_ownerId: { interactionTargetId, ownerId },
        },
      });
      if (existing) {
        return { bookmark: existing, saved: true, changed: false };
      }

      const bookmark = await transaction.bookmark.create({
        data: { interactionTargetId, ownerId },
      });
      await this.record(transaction, bookmark, 'saved');
      return { bookmark, saved: true, changed: true };
    });
  }

  async remove(
    interactionTargetId: string,
    ownerId: string,
  ): Promise<BookmarkMutationResult> {
    return this.prisma.$transaction(async (transaction) => {
      await this.lockRelationship(transaction, interactionTargetId, ownerId);
      const existing = await transaction.bookmark.findUnique({
        where: {
          interactionTargetId_ownerId: { interactionTargetId, ownerId },
        },
      });
      if (!existing) {
        return { bookmark: null, saved: false, changed: false };
      }

      await transaction.bookmark.delete({ where: { id: existing.id } });
      await this.record(transaction, existing, 'removed');
      return { bookmark: null, saved: false, changed: true };
    });
  }

  async list(
    ownerId: string,
    page: number,
    limit: number,
  ): Promise<BookmarkPage> {
    const where = { ownerId };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.bookmark.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.bookmark.count({ where }),
    ]);
    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  private async lockRelationship(
    transaction: Parameters<AuditWriterService['append']>[0],
    targetId: string,
    ownerId: string,
  ): Promise<void> {
    await transaction.$executeRaw`
      SELECT pg_advisory_xact_lock(hashtext(${`${ownerId}:${targetId}`}))
    `;
  }

  private async record(
    transaction: Parameters<AuditWriterService['append']>[0],
    bookmark: Bookmark,
    action: 'saved' | 'removed',
  ): Promise<void> {
    await this.audit.append(transaction, {
      action: `bookmarks.bookmark.${action}`,
      actorType: 'USER',
      actorId: bookmark.ownerId,
      targetType: 'InteractionTarget',
      targetId: bookmark.interactionTargetId,
      metadata: { bookmarkId: bookmark.id },
    });
    await this.outbox.append(
      transaction,
      createEventEnvelope({
        name: `bookmarks.bookmark.${action}.v1`,
        version: 1,
        category: 'integration',
        producer: PRODUCER,
        actorId: bookmark.ownerId,
        aggregate: { type: 'Bookmark', id: bookmark.id },
        payload: {
          bookmarkId: bookmark.id,
          interactionTargetId: bookmark.interactionTargetId,
          ownerId: bookmark.ownerId,
        },
      }),
    );
  }
}

/**
 * Retry-safe bookmarks: the exciting part should be the content, not the write.
 */
