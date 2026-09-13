/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Interaction Platform
 * 📄 File: apps/api/src/modules/interactions/infrastructure/repositories/prisma-comment-drafts.repository.ts
 *
 * 🎯 Purpose:
 * Persists private comment drafts with atomic optimistic version checks.
 *
 * 🧠 Responsibilities:
 * • creates one draft per author and comment scope;
 * • advances versions only from the supplied base version;
 * • returns conflicts without leaking another author's draft;
 * • hard-deletes discarded private drafts.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '@api/core/database';

import type { CommentDraftsRepository } from '../../domain/repositories/comment-drafts.repository.interface';
import type {
  CommentDraft,
  SaveCommentDraft,
} from '../../domain/types/comment-draft.type';

@Injectable()
export class PrismaCommentDraftsRepository implements CommentDraftsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(input: SaveCommentDraft): Promise<CommentDraft | null> {
    if (input.baseVersion === 0) {
      try {
        return this.toDomain(
          await this.prisma.commentDraft.create({
            data: {
              authorId: input.authorId,
              interactionTargetId: input.interactionTargetId,
              parentId: input.parentId,
              scopeKey: input.scopeKey,
              document: this.parseDocument(input.documentJson),
              plainText: input.plainText,
            },
          }),
        );
      } catch (error: unknown) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          return null;
        }
        throw error;
      }
    }

    return this.prisma.$transaction(async (transaction) => {
      const changed = await transaction.commentDraft.updateMany({
        where: {
          authorId: input.authorId,
          scopeKey: input.scopeKey,
          version: input.baseVersion,
        },
        data: {
          document: this.parseDocument(input.documentJson),
          plainText: input.plainText,
          version: { increment: 1 },
        },
      });
      if (changed.count !== 1) return null;
      const draft = await transaction.commentDraft.findUniqueOrThrow({
        where: {
          authorId_scopeKey: {
            authorId: input.authorId,
            scopeKey: input.scopeKey,
          },
        },
      });
      return this.toDomain(draft);
    });
  }

  async findById(id: string): Promise<CommentDraft | null> {
    const draft = await this.prisma.commentDraft.findUnique({ where: { id } });
    return draft ? this.toDomain(draft) : null;
  }

  async findByScope(
    authorId: string,
    scopeKey: string,
  ): Promise<CommentDraft | null> {
    const draft = await this.prisma.commentDraft.findUnique({
      where: { authorId_scopeKey: { authorId, scopeKey } },
    });
    return draft ? this.toDomain(draft) : null;
  }

  async listByAuthor(authorId: string, limit: number): Promise<CommentDraft[]> {
    const drafts = await this.prisma.commentDraft.findMany({
      where: { authorId },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: limit,
    });
    return drafts.map((draft) => this.toDomain(draft));
  }

  async delete(id: string, authorId: string): Promise<boolean> {
    const changed = await this.prisma.commentDraft.deleteMany({
      where: { id, authorId },
    });
    return changed.count === 1;
  }

  private parseDocument(documentJson: string): Prisma.InputJsonValue {
    return JSON.parse(documentJson) as Prisma.InputJsonValue;
  }

  private toDomain(record: {
    id: string;
    authorId: string;
    interactionTargetId: string;
    parentId: string | null;
    document: Prisma.JsonValue;
    plainText: string;
    version: number;
    createdAt: Date;
    updatedAt: Date;
  }): CommentDraft {
    return {
      ...record,
      documentJson: JSON.stringify(record.document),
    };
  }
}

/** Autosave is quiet; version conflicts are allowed to be loud. */
