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
 * 🏗️ Architecture:
 * Editor-owned redaction consumes a minimal decision port wired at the root.
 *
 * ⚠️ Important:
 * Provider failures propagate; no gate aggregate or default-allow decision enters Editor.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Inject, Injectable } from '@nestjs/common';
import type { EditorDocument, EditorNode, EditorProfile } from '@dss/editor';

import {
  EDITOR_GATE_DECISIONS,
  type EditorGateDecisions,
  type EditorGateDecision,
} from '../../domain/ports/editor-gate-decisions.interface';
import type {
  EditorContentGateDecision,
  EditorDeliveryProjection,
} from '../types/editor-delivery.type';
import { EditorService } from './editor.service';

@Injectable()
export class EditorContentDeliveryService {
  constructor(
    private readonly editor: EditorService,
    @Inject(EDITOR_GATE_DECISIONS)
    private readonly contentGates: EditorGateDecisions,
  ) {}

  async project(
    documentJson: string,
    viewerId: string | null,
    expectedProfile?: EditorProfile,
  ): Promise<EditorDeliveryProjection> {
    const canonical = this.editor.normalize(
      documentJson,
      expectedProfile,
    ).document;
    const evaluations = new Map<string, Promise<EditorGateDecision>>();
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
    evaluations: Map<string, Promise<EditorGateDecision>>,
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
    evaluations: Map<string, Promise<EditorGateDecision>>,
  ): Promise<EditorGateDecision> {
    const cached = evaluations.get(gateId);
    if (cached) return cached;
    const evaluation = this.contentGates.evaluate(gateId, viewerId);
    evaluations.set(gateId, evaluation);
    return evaluation;
  }

  private toDecision(
    evaluation: EditorGateDecision,
  ): EditorContentGateDecision {
    return {
      gateId: evaluation.gateId,
      allowed: evaluation.allowed,
      bypassed: evaluation.bypassed,
      unmet: evaluation.unmet,
      notice: evaluation.notice,
    };
  }
}

/** If a locked secret reaches the browser, the lock was only theatre. */
