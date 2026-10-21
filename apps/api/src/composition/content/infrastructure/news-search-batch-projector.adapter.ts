/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Content Composition
 * 📄 File: apps/api/src/composition/content/infrastructure/news-search-batch-projector.adapter.ts
 *
 * 🎯 Purpose:
 * Connects News batch search to Editor-owned redaction without returning provider metadata.
 *
 * 🧠 Responsibilities:
 * • preserves input/output order and selects only permitted search text;
 * • propagates validation and projection failures, never authored text.
 *
 * 🏗️ Architecture:
 * Named root composition adapter; no feature-private import or viewer access facts.
 *
 * ⚠️ Important:
 * A partial projection is an error, not a smaller set of eligible search candidates.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Inject, Injectable } from '@nestjs/common';
import {
  EDITOR_SEARCH_BATCH_PROJECTOR,
  type EditorSearchBatchProjector,
} from '@api/modules/editor';
import type { NewsSearchBatchProjector } from '@api/modules/news';
@Injectable()
export class NewsSearchBatchProjectorAdapter implements NewsSearchBatchProjector {
  constructor(
    @Inject(EDITOR_SEARCH_BATCH_PROJECTOR)
    private readonly editor: EditorSearchBatchProjector,
  ) {}
  async project(documents: readonly string[], viewerId: string) {
    const result = await this.editor.project(documents, viewerId);
    if (result.length !== documents.length)
      throw new Error('Search batch projection is incomplete.');
    return result.map(({ searchText }) => ({ searchText }));
  }
}
