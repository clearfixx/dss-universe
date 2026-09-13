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

import { ContentAccessModule } from '../content-access/content-access.module';

import { EDITOR_CODE_HIGHLIGHTER } from './application/contracts/editor-code-highlighter.interface';
import { EditorContentDeliveryService } from './application/services/editor-content-delivery.service';
import { EditorService } from './application/services/editor.service';
import { EditorHtmlRenderer } from './infrastructure/rendering/editor-html.renderer';
import { ShikiEditorCodeHighlighter } from './infrastructure/rendering/shiki-editor-code-highlighter';
import { EditorResolver } from './presentation/graphql/editor.resolver';

@Module({
  imports: [ContentAccessModule],
  providers: [
    EditorService,
    EditorContentDeliveryService,
    EditorHtmlRenderer,
    ShikiEditorCodeHighlighter,
    {
      provide: EDITOR_CODE_HIGHLIGHTER,
      useExisting: ShikiEditorCodeHighlighter,
    },
    EditorResolver,
  ],
  exports: [EditorService, EditorContentDeliveryService],
})
export class EditorModule {}

/** One schema service for every content module; duplication stays outside the airlock. */
