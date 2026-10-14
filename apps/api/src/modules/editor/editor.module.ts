/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: DSS Editor Platform
 * 📄 File: apps/api/src/modules/editor/editor.module.ts
 *
 * 🎯 Purpose:
 * Composes server-side DSS Editor validation, projection and GraphQL preview.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Module } from '@nestjs/common';
import { EDITOR_SEARCH_BATCH_PROJECTOR } from './contracts/editor-search-batch-projector.contract';
import { EditorSearchBatchProjectorService } from './application/services/editor-search-batch-projector.service';

import { EDITOR_DOCUMENT_NORMALIZER } from './contracts/editor-document-normalizer.contract';
import { EDITOR_VIEWER_DOCUMENT_PROJECTOR } from './contracts/editor-viewer-document-projector.contract';
import { EDITOR_SEARCH_PROJECTOR } from './contracts/editor-search-projector.contract';
import { EditorSearchProjectorService } from './application/services/editor-search-projector.service';
import { EditorViewerDocumentProjectorService } from './application/services/editor-viewer-document-projector.service';
import { EDITOR_CODE_HIGHLIGHTER } from './application/contracts/editor-code-highlighter.interface';
import { EditorContentDeliveryService } from './application/services/editor-content-delivery.service';
import { EditorService } from './application/services/editor.service';
import { EditorDocumentNormalizerService } from './application/services/editor-document-normalizer.service';
import { EditorHtmlRenderer } from './infrastructure/rendering/editor-html.renderer';
import { ShikiEditorCodeHighlighter } from './infrastructure/rendering/shiki-editor-code-highlighter';
import { EditorResolver } from './presentation/graphql/editor.resolver';

@Module({
  providers: [
    EditorSearchBatchProjectorService,
    {
      provide: EDITOR_SEARCH_BATCH_PROJECTOR,
      useExisting: EditorSearchBatchProjectorService,
    },
    EditorService,
    EditorDocumentNormalizerService,
    {
      provide: EDITOR_DOCUMENT_NORMALIZER,
      useExisting: EditorDocumentNormalizerService,
    },
    EditorContentDeliveryService,
    EditorSearchProjectorService,
    {
      provide: EDITOR_SEARCH_PROJECTOR,
      useExisting: EditorSearchProjectorService,
    },
    EditorViewerDocumentProjectorService,
    {
      provide: EDITOR_VIEWER_DOCUMENT_PROJECTOR,
      useExisting: EditorViewerDocumentProjectorService,
    },
    EditorHtmlRenderer,
    ShikiEditorCodeHighlighter,
    {
      provide: EDITOR_CODE_HIGHLIGHTER,
      useExisting: ShikiEditorCodeHighlighter,
    },
    EditorResolver,
  ],
  exports: [
    EDITOR_SEARCH_BATCH_PROJECTOR,
    EDITOR_DOCUMENT_NORMALIZER,
    EDITOR_VIEWER_DOCUMENT_PROJECTOR,
    EDITOR_SEARCH_PROJECTOR,
  ],
})
export class EditorModule {}

/** One schema service for every content module; duplication stays outside the airlock. */
