/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Content Read Composition
 * 📄 File: apps/api/src/composition/content-reads/infrastructure/gate-comment-count.adapter.ts
 *
 * 🎯 Purpose:
 * Binds scalar comment counts to Content Access without importing a repository.
 *
 * 🧠 Responsibilities:
 * • forwards only the author coordinate;
 * • propagates scalar evidence and owner failures.
 *
 * 🏗️ Architecture:
 * Root adapter between independently owned count contracts.
 *
 * ⚠️ Important:
 * No content or target aggregate is passed to Content Access.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Inject, Injectable } from '@nestjs/common';
import {
  COMMENT_COUNT_READER,
  type CommentCountReader,
} from '@api/modules/interactions';
import type { GateCommentCountReader } from '@api/modules/content-access';
@Injectable()
export class GateCommentCountAdapter implements GateCommentCountReader {
  constructor(
    @Inject(COMMENT_COUNT_READER) private readonly comments: CommentCountReader,
  ) {}
  countByAuthor(authorId: string): Promise<number> {
    return this.comments.countByAuthor(authorId);
  }
}
