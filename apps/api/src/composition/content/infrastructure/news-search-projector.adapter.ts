/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Content Composition
 * 📄 File: apps/api/src/composition/content/infrastructure/news-search-projector.adapter.ts
 *
 * 🎯 Purpose:
 * Connects News-owned search evidence to the published Editor projection contract.
 *
 * 🧠 Responsibilities:
 * • forwards canonical JSON and opaque viewer context to the owner;
 * • selects only public index metadata or viewer-safe search text;
 * • propagates validation and policy failures without a raw fallback.
 *
 * 🏗️ Architecture:
 * Root composition adapter; neither feature module imports the other's internals.
 *
 * ⚠️ Important:
 * No authored payload, gate aggregate, profile, credentials or ORM crosses the return boundary.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Inject, Injectable } from '@nestjs/common';
import {
  EDITOR_SEARCH_PROJECTOR,
  type EditorSearchProjector,
} from '@api/modules/editor';
import type { NewsSearchProjector } from '@api/modules/news';

@Injectable()
export class NewsSearchProjectorAdapter implements NewsSearchProjector {
  constructor(
    @Inject(EDITOR_SEARCH_PROJECTOR)
    private readonly editor: EditorSearchProjector,
  ) {}

  projectPublic(documentJson: string) {
    const projection = this.editor.projectPublic(documentJson);
    return {
      searchText: projection.searchText,
      hasContentGates: projection.hasContentGates,
    };
  }

  async projectForViewer(documentJson: string, viewerId: string) {
    const projection = await this.editor.projectForViewer(
      documentJson,
      viewerId,
    );
    return { searchText: projection.searchText };
  }
}
