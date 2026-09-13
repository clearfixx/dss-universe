/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: DSS Editor Platform
 * 📄 File: apps/api/src/modules/editor/application/services/editor-content-delivery.service.ts
 *
 * 🎯 Purpose:
 * Produces viewer-safe editor documents at publication response boundaries.
 *
 * 🧠 Responsibilities:
 * • validates canonical editor JSON before delivery;
 * • evaluates every referenced Content Gate for the current viewer;
 * • recursively removes denied protected payloads on the server;
 * • returns explicit gate decisions for safe placeholder rendering.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Injectable } from '@nestjs/common';
import type { EditorDocument, EditorNode } from '@dss/editor';

import { ContentGatesService } from '../../../content-access/application/services/content-gates.service';
import type { ContentGateEvaluation } from '../../../content-access/domain/types/content-gate.type';
import type {
  EditorContentGateDecision,
  EditorDeliveryProjection,
} from '../types/editor-delivery.type';
import { EditorService } from './editor.service';

@Injectable()
export class EditorContentDeliveryService {
  constructor(
    private readonly editor: EditorService,
    private readonly contentGates: ContentGatesService,
  ) {}

  async project(
    documentJson: string,
    viewerId: string | null,
  ): Promise<EditorDeliveryProjection> {
    const canonical = this.editor.normalize(documentJson).document;
    const evaluations = new Map<string, Promise<ContentGateEvaluation>>();
    const content = (await this.redactNode(
      canonical.content,
      viewerId,
      evaluations,
    )) as EditorDocument['content'];
    const document: EditorDocument = { ...canonical, content };

    return {
      document,
      documentJson: JSON.stringify(document),
      gates: (await Promise.all(evaluations.values())).map((evaluation) =>
        this.toDecision(evaluation),
      ),
    };
  }

  private async redactNode(
    node: EditorNode,
    viewerId: string | null,
    evaluations: Map<string, Promise<ContentGateEvaluation>>,
  ): Promise<EditorNode> {
    if (node.type === 'contentGate') {
      const gateId = node.attrs?.gateId;
      if (typeof gateId !== 'string') {
        return node;
      }
      const evaluation = await this.evaluateOnce(gateId, viewerId, evaluations);
      if (!evaluation.allowed) {
        return { type: 'contentGate', attrs: { gateId } };
      }
    }

    if (!node.content) return node;
    return {
      ...node,
      content: await Promise.all(
        node.content.map((child) =>
          this.redactNode(child, viewerId, evaluations),
        ),
      ),
    };
  }

  private async evaluateOnce(
    gateId: string,
    viewerId: string | null,
    evaluations: Map<string, Promise<ContentGateEvaluation>>,
  ): Promise<ContentGateEvaluation> {
    const cached = evaluations.get(gateId);
    if (cached) return cached;
    const evaluation = this.contentGates.evaluate(gateId, viewerId);
    evaluations.set(gateId, evaluation);
    return evaluation;
  }

  private toDecision(
    evaluation: ContentGateEvaluation,
  ): EditorContentGateDecision {
    return {
      gateId: evaluation.gate.id,
      allowed: evaluation.allowed,
      bypassed: evaluation.bypassed,
      unmet: evaluation.unmet,
      notice: evaluation.notice,
    };
  }
}

/** If a locked secret reaches the browser, the lock was only theatre. */
