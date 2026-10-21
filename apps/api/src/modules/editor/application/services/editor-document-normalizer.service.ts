/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: DSS Editor Platform
 * 📄 File: apps/api/src/modules/editor/application/services/editor-document-normalizer.service.ts
 *
 * 🎯 Purpose:
 * Pins expected profiles at the owner boundary before returning canonical projections.
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
import { Injectable } from '@nestjs/common';
import type {
  EditorDocumentNormalizer,
  ValidatedEditorDocument,
} from '../../contracts/editor-document-normalizer.contract';
import { EditorService } from './editor.service';

@Injectable()
export class EditorDocumentNormalizerService implements EditorDocumentNormalizer {
  constructor(private readonly editor: EditorService) {}
  normalizeNews(documentJson: string): ValidatedEditorDocument {
    return this.editor.normalize(documentJson, 'NEWS');
  }
  normalizeComment(documentJson: string): ValidatedEditorDocument {
    return this.editor.normalize(documentJson, 'COMMENT');
  }
}
