/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: DSS Editor Platform
 * 📄 File: apps/api/src/modules/editor/application/services/editor-search-projector.service.ts
 *
 * 🎯 Purpose:
 * Derives NEWS search text with canonical Editor semantics and owner-controlled redaction.
 *
 * 🧠 Responsibilities:
 * • validates the NEWS profile before producing any search evidence;
 * • builds public text without visiting policy providers;
 * • derives viewer text only after the existing fail-closed delivery operation.
 *
 * 🏗️ Architecture:
 * Private Editor adapter behind a named search projection contract.
 *
 * ⚠️ Important:
 * Only permitted text, not authored gate JSON or verdicts, crosses the contract.
 * Provider errors propagate.
 * Public-only text must not be used as an authenticated gated match shortcut.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Injectable } from '@nestjs/common';
import {
  projectEditorPublicSearch,
  projectEditorSearchText,
} from '@dss/editor';
import type { EditorSearchProjector } from '../../contracts/editor-search-projector.contract';
import { EditorContentDeliveryService } from './editor-content-delivery.service';
import { EditorService } from './editor.service';

@Injectable()
export class EditorSearchProjectorService implements EditorSearchProjector {
  constructor(
    private readonly editor: EditorService,
    private readonly delivery: EditorContentDeliveryService,
  ) {}

  projectPublic(documentJson: string) {
    const { document } = this.editor.normalize(documentJson, 'NEWS');
    return projectEditorPublicSearch(document);
  }

  async projectForViewer(
    documentJson: string,
    viewerId: string,
  ): Promise<Readonly<{ searchText: string }>> {
    const { document } = await this.delivery.project(
      documentJson,
      viewerId,
      'NEWS',
    );
    return { searchText: projectEditorSearchText(document) };
  }
}
