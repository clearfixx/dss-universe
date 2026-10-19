/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Content Presentation Composition
 * 📄 File: apps/api/src/composition/content-presentation/presentation/graphql/editor.resolver.ts
 *
 * 🎯 Purpose:
 * Exposes authenticated server validation and preview through GraphQL.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Inject, UseGuards } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';

import { AuthUser, JwtAuthGuard, type AuthenticatedUser } from '@api/core/auth';

import {
  EDITOR_PREVIEW_READER,
  EDITOR_DELIVERY_READER,
  type EditorPreviewReader,
  type EditorDeliveryReader,
} from '@api/modules/editor';
import { toContentGateRequirementKind } from './content-gate.mapping';
import { PreviewEditorDocumentInput } from './editor.input';
import {
  EditorDocumentDeliveryModel,
  EditorDocumentPreviewModel,
} from './editor.model';

@Resolver()
@UseGuards(JwtAuthGuard)
export class EditorResolver {
  constructor(
    @Inject(EDITOR_PREVIEW_READER) private readonly editor: EditorPreviewReader,
    @Inject(EDITOR_DELIVERY_READER)
    private readonly delivery: EditorDeliveryReader,
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
      gates: projection.gates.map(
        ({ gateId, allowed, bypassed, unmet, notice }) => ({
          gateId,
          allowed,
          bypassed,
          unmet: unmet.map(toContentGateRequirementKind),
          notice,
        }),
      ),
    };
  }
}

/** GraphQL previews drafts and delivers only viewer-safe projections. */
