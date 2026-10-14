/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: DSS Editor Platform
 * 📄 File: apps/api/src/modules/editor/application/services/editor-search-batch-projector.service.ts
 *
 * 🎯 Purpose:
 * Produces bounded viewer-safe search batches using one private access-evidence scope.
 *
 * 🧠 Responsibilities:
 * • bounds input to 64 documents and active redactions to four;
 * • preserves canonical NEWS validation and recursive reachable-gate evaluation;
 * • drains started work and closes the scope on both success and failure.
 *
 * 🏗️ Architecture:
 * Editor-owned batch application service; no access facts or persistence enter Editor.
 *
 * ⚠️ Important:
 * No scope or decision cache survives this operation. Never pre-evaluate denied descendants.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { projectEditorSearchText } from '@dss/editor';
import type { EditorSearchBatchProjector } from '../../contracts/editor-search-batch-projector.contract';
import {
  EDITOR_GATE_DECISION_SCOPES,
  type EditorGateDecisionScopes,
} from '../../domain/ports/editor-gate-decision-scopes.interface';
import { EditorContentDeliveryService } from './editor-content-delivery.service';

@Injectable()
export class EditorSearchBatchProjectorService implements EditorSearchBatchProjector {
  constructor(
    private readonly delivery: EditorContentDeliveryService,
    @Inject(EDITOR_GATE_DECISION_SCOPES)
    private readonly scopes: EditorGateDecisionScopes,
  ) {}
  async project(documents: readonly string[], viewerId: string) {
    if (documents.length > 64 || !viewerId.trim())
      throw new BadRequestException(
        'Search projection requires a viewer and at most 64 documents.',
      );
    if (!documents.length) return [];
    const inputs = [...documents];
    const scope = this.scopes.open(viewerId);
    const result: { searchText: string }[] = [];
    try {
      for (let offset = 0; offset < inputs.length; offset += 4) {
        const chunk = await Promise.allSettled(
          inputs.slice(offset, offset + 4).map(async (documentJson) => {
            const projection = await this.delivery.project(
              documentJson,
              viewerId,
              'NEWS',
              { evaluate: (gateId) => scope.evaluate(gateId) },
            );
            return { searchText: projectEditorSearchText(projection.document) };
          }),
        );
        const failed = chunk.find((item) => item.status === 'rejected');
        if (failed?.status === 'rejected') {
          const failure: unknown = failed.reason;
          throw failure;
        }
        for (const item of chunk)
          if (item.status === 'fulfilled') result.push(item.value);
      }
      return result;
    } finally {
      scope.close();
    }
  }
}

/** A batch context is not a season pass. It leaves at the airlock. */
