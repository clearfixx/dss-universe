/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Content Composition
 * 📄 File: apps/api/src/composition/content/infrastructure/news-viewer-document.adapter.ts
 *
 * 🎯 Purpose:
 * Binds the News viewer-document input to Editor-owned safe publication.
 *
 * 🧠 Responsibilities:
 * • forwards opaque viewer context without deriving permissions;
 * • selects only safe JSON and propagates failed evidence.
 *
 * 🏗️ Architecture:
 * Root adapter between independent owned contracts; no business policy or ORM.
 *
 * ⚠️ Important:
 * Never return the authored input when projection fails.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Inject, Injectable } from '@nestjs/common';
import {
  EDITOR_VIEWER_DOCUMENT_PROJECTOR,
  type EditorViewerDocumentProjector,
} from '@api/modules/editor';
import type { NewsViewerDocumentReader } from '@api/modules/news';

@Injectable()
export class NewsViewerDocumentAdapter implements NewsViewerDocumentReader {
  constructor(
    @Inject(EDITOR_VIEWER_DOCUMENT_PROJECTOR)
    private readonly editor: EditorViewerDocumentProjector,
  ) {}

  async project(
    documentJson: string,
    viewerId: string | null,
  ): Promise<Readonly<{ documentJson: string }>> {
    const projection = await this.editor.project(documentJson, viewerId);
    return { documentJson: projection.documentJson };
  }
}
