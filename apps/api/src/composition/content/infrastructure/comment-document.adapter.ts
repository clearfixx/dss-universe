/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Content Composition
 * 📄 File: apps/api/src/composition/content/infrastructure/comment-document.adapter.ts
 *
 * 🎯 Purpose:
 * Adapts the COMMENT-only Editor operation to the Interactions-owned normalization port.
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
} from '@api/modules/editor';
import type {
  CommentDocumentNormalizer,
  CommentDocumentProjection,
} from '@api/modules/interactions';

@Injectable()
export class CommentDocumentAdapter implements CommentDocumentNormalizer {
  constructor(
    @Inject(EDITOR_DOCUMENT_NORMALIZER)
    private readonly editor: EditorDocumentNormalizer,
  ) {}
  normalize(documentJson: string): CommentDocumentProjection {
    const projection = this.editor.normalizeComment(documentJson);
    return {
      document: projection.document,
      canonicalJson: projection.canonicalJson,
      plainText: projection.plainText,
      searchText: projection.searchText,
    };
  }
}
