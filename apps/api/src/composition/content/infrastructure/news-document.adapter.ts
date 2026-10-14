/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Content Composition
 * 📄 File: apps/api/src/composition/content/infrastructure/news-document.adapter.ts
 *
 * 🎯 Purpose:
 * Adapts the NEWS-only Editor operation to the News-owned draft projection.
 *
 * 🧠 Responsibilities:
 * • exposes only the operation-specific data required by its consumer;
 * • preserves owner validation and propagates failures without defaults.
 *
 * 🏗️ Architecture:
 * Narrow dependency boundary; policy and persistence stay with their owners.
 *
 * ⚠️ Important:
 * No credentials, gate aggregate or ORM transaction crosses this boundary.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Inject, Injectable } from '@nestjs/common';
import {
  EDITOR_DOCUMENT_NORMALIZER,
  type EditorDocumentNormalizer,
  EDITOR_SEARCH_PROJECTOR,
  type EditorSearchProjector,
} from '@api/modules/editor';
import type {
  NewsDocumentNormalizer,
  NewsDocumentProjection,
} from '@api/modules/news';

@Injectable()
export class NewsDocumentAdapter implements NewsDocumentNormalizer {
  constructor(
    @Inject(EDITOR_DOCUMENT_NORMALIZER)
    private readonly editor: EditorDocumentNormalizer,
    @Inject(EDITOR_SEARCH_PROJECTOR)
    private readonly search: EditorSearchProjector,
  ) {}
  normalize(documentJson: string): NewsDocumentProjection {
    const projection = this.editor.normalizeNews(documentJson);
    const publicProjection = this.search.projectPublic(
      projection.canonicalJson,
    );
    return {
      document: projection.document,
      plainText: projection.plainText,
      searchText: projection.searchText,
      publicSearchText: publicProjection.searchText,
      hasContentGates: publicProjection.hasContentGates,
    };
  }
}
