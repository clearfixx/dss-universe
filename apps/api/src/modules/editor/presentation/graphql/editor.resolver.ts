/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: DSS Editor Platform
 * 📄 File: apps/api/src/modules/editor/presentation/graphql/editor.resolver.ts
 *
 * 🎯 Purpose:
 * Exposes authenticated server validation and preview through GraphQL.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { UseGuards } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';

import { JwtAuthGuard } from '@api/core/auth';

import { EditorService } from '../../application/services/editor.service';
import { PreviewEditorDocumentInput } from './editor.input';
import { EditorDocumentPreviewModel } from './editor.model';

@Resolver()
@UseGuards(JwtAuthGuard)
export class EditorResolver {
  constructor(private readonly editor: EditorService) {}

  @Query(() => EditorDocumentPreviewModel)
  async previewEditorDocument(
    @Args('input') input: PreviewEditorDocumentInput,
  ): Promise<EditorDocumentPreviewModel> {
    const preview = await this.editor.preview(input.documentJson);
    return {
      canonicalJson: preview.canonicalJson,
      html: preview.html,
      plainText: preview.plainText,
      searchText: preview.searchText,
    };
  }
}

/** GraphQL asks for a preview; it never grants storage authority. */
