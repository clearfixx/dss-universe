/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: DSS Editor Platform
 * 📄 File: apps/api/src/modules/editor/application/services/editor-preview-reader.service.ts
 *
 * 🎯 Purpose:
 * Allowlists preview scalars from Editor-owned normalization and rendering.
 *
 * 🧠 Responsibilities:
 * • delegates to the existing owned use case without duplicating policy;
 * • propagates validation and provider failures without permissive fallbacks.
 *
 * 🏗️ Architecture:
 * Named owner capability; no foreign service, ORM or transport dependency.
 *
 * ⚠️ Important:
 * Root presentation consumes only the declared capability, never this service.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Injectable } from '@nestjs/common';
import type {
  EditorPreviewReader,
  EditorPreviewView,
} from '../../contracts/editor-preview-reader.contract';
import { EditorService } from './editor.service';
@Injectable()
export class EditorPreviewReaderService implements EditorPreviewReader {
  constructor(private readonly editor: EditorService) {}
  async preview(documentJson: string): Promise<EditorPreviewView> {
    const preview = await this.editor.preview(documentJson);
    return {
      canonicalJson: preview.canonicalJson,
      html: preview.html,
      plainText: preview.plainText,
      searchText: preview.searchText,
    };
  }
}
