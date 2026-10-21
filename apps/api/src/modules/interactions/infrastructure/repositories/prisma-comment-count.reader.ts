/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Interaction Platform
 * 📄 File: apps/api/src/modules/interactions/infrastructure/repositories/prisma-comment-count.reader.ts
 *
 * 🎯 Purpose:
 * Reads owned comment evidence without exposing text or target records.
 *
 * 🧠 Responsibilities:
 * • counts all non-tombstoned comments by author;
 * • propagates storage errors without a zero-success fallback.
 *
 * 🏗️ Architecture:
 * Private Interactions read adapter, published only through a scalar contract.
 *
 * ⚠️ Important:
 * Do not add target lifecycle or audience filters to the existing global count.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@api/core/database';
import type { CommentCountReader } from '../../contracts/comment-count-reader.contract';
@Injectable()
export class PrismaCommentCountReader implements CommentCountReader {
  constructor(private readonly prisma: PrismaService) {}
  countByAuthor(authorId: string): Promise<number> {
    return this.prisma.comment.count({ where: { authorId, deletedAt: null } });
  }
}
