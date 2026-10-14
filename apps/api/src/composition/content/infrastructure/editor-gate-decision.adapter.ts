/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Content Composition
 * 📄 File: apps/api/src/composition/content/infrastructure/editor-gate-decision.adapter.ts
 *
 * 🎯 Purpose:
 * Translates the closed Content Access verdict into the Editor-owned redaction contract.
 *
 * 🧠 Responsibilities:
 * • exposes only the operation-specific data required by its consumer;
 * • preserves owner validation and propagates failures without defaults.
 *
 * 🏗️ Architecture:
 * Narrow dependency boundary; policy and persistence stay with their owners.
 *
 * ⚠️ Important:
 * No credentials, gate aggregate or ORM transaction crosses this boundary.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Inject, Injectable } from '@nestjs/common';
import {
  CONTENT_GATE_DECISIONS,
  type ContentGateDecisions,
  type ContentGateRequirementKind,
} from '@api/modules/content-access';
import type {
  EditorGateDecisions,
  EditorGateDecision,
  EditorGateRequirement,
} from '@api/modules/editor';

const requirementKinds: Record<
  ContentGateRequirementKind,
  EditorGateRequirement
> = {
  ACCOUNT_AGE_DAYS: 'ACCOUNT_AGE_DAYS',
  COMMENTS: 'COMMENTS',
  FORUM_POSTS: 'FORUM_POSTS',
  PUBLICATIONS: 'PUBLICATIONS',
  REPUTATION: 'REPUTATION',
  GROUP: 'GROUP',
};
@Injectable()
export class EditorGateDecisionAdapter implements EditorGateDecisions {
  constructor(
    @Inject(CONTENT_GATE_DECISIONS)
    private readonly decisions: ContentGateDecisions,
  ) {}
  async evaluate(
    gateId: string,
    viewerId: string | null,
  ): Promise<EditorGateDecision> {
    const decision = await this.decisions.evaluate(gateId, viewerId);
    return {
      gateId: decision.gateId,
      allowed: decision.allowed,
      bypassed: decision.bypassed,
      unmet: decision.unmet.map((kind) => requirementKinds[kind]),
      notice: decision.notice,
    };
  }
}
