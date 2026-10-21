/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: DSS Editor Platform
 * 📄 File: apps/api/src/modules/editor/application/services/editor-viewer-document-projector.service.ts
 *
 * 🎯 Purpose:
 * Exposes a minimal publication projection over Editor-owned redaction.
 *
 * 🧠 Responsibilities:
 * • delegates canonical validation and viewer policy to existing Editor delivery;
 * • selects safe document JSON without exposing full decision projections.
 *
 * 🏗️ Architecture:
 * Private application adapter behind the published Editor projection contract.
 *
 * ⚠️ Important:
 * Validation and provider failures propagate; raw JSON is never a fallback.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Injectable } from '@nestjs/common';
import type { EditorViewerDocumentProjector } from '../../contracts/editor-viewer-document-projector.contract';
import { EditorContentDeliveryService } from './editor-content-delivery.service';

@Injectable()
export class EditorViewerDocumentProjectorService implements EditorViewerDocumentProjector {
  constructor(private readonly delivery: EditorContentDeliveryService) {}

  async project(
    documentJson: string,
    viewerId: string | null,
  ): Promise<Readonly<{ documentJson: string }>> {
    const projection = await this.delivery.project(documentJson, viewerId);
    return { documentJson: projection.documentJson };
  }
}
