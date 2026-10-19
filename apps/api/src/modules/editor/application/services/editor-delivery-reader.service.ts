/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: DSS Editor Platform
 * 📄 File: apps/api/src/modules/editor/application/services/editor-delivery-reader.service.ts
 *
 * 🎯 Purpose:
 * Allowlists already-redacted JSON and verdicts from Editor-owned delivery.
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
  EditorDeliveryReader,
  EditorDeliveryView,
} from '../../contracts/editor-delivery-reader.contract';
import { EditorContentDeliveryService } from './editor-content-delivery.service';
@Injectable()
export class EditorDeliveryReaderService implements EditorDeliveryReader {
  constructor(private readonly delivery: EditorContentDeliveryService) {}
  async project(
    documentJson: string,
    viewerId: string,
  ): Promise<EditorDeliveryView> {
    const result = await this.delivery.project(documentJson, viewerId);
    return {
      documentJson: result.documentJson,
      gates: result.gates.map(
        ({ gateId, allowed, bypassed, unmet, notice }) => ({
          gateId,
          allowed,
          bypassed,
          unmet: [...unmet],
          notice,
        }),
      ),
    };
  }
}
