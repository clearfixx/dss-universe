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

import { EDITOR_CODE_HIGHLIGHTER } from './application/contracts/editor-code-highlighter.interface';
import { EditorService } from './application/services/editor.service';
import { EditorHtmlRenderer } from './infrastructure/rendering/editor-html.renderer';
import { ShikiEditorCodeHighlighter } from './infrastructure/rendering/shiki-editor-code-highlighter';
import { EditorResolver } from './presentation/graphql/editor.resolver';

@Module({
  providers: [
    EditorService,
    EditorHtmlRenderer,
    ShikiEditorCodeHighlighter,
    {
      provide: EDITOR_CODE_HIGHLIGHTER,
      useExisting: ShikiEditorCodeHighlighter,
    },
    EditorResolver,
  ],
  exports: [EditorService],
})
export class EditorModule {}

/** One schema service for every content module; duplication stays outside the airlock. */
