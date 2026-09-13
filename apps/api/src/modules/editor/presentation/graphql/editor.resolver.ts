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

import { AuthUser, JwtAuthGuard, type AuthenticatedUser } from '@api/core/auth';

import { EditorContentDeliveryService } from '../../application/services/editor-content-delivery.service';
import { EditorService } from '../../application/services/editor.service';
import { PreviewEditorDocumentInput } from './editor.input';
import {
  EditorDocumentDeliveryModel,
  EditorDocumentPreviewModel,
} from './editor.model';

@Resolver()
@UseGuards(JwtAuthGuard)
export class EditorResolver {
  constructor(
    private readonly editor: EditorService,
    private readonly delivery: EditorContentDeliveryService,
  ) {}

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

  @Query(() => EditorDocumentDeliveryModel)
  async deliverEditorDocument(
    @AuthUser() actor: AuthenticatedUser,
    @Args('input') input: PreviewEditorDocumentInput,
  ): Promise<EditorDocumentDeliveryModel> {
    const projection = await this.delivery.project(
      input.documentJson,
      actor.id,
    );
    return {
      documentJson: projection.documentJson,
      gates: projection.gates,
    };
  }
}

/** GraphQL previews drafts and delivers only viewer-safe projections. */
