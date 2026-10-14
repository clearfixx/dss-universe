/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Content Composition
 * 📄 File: apps/api/src/composition/content/infrastructure/editor-gate-decision-scopes.adapter.ts
 *
 * 🎯 Purpose:
 * Binds viewer-scoped verdicts while keeping private ContentAccess evidence outside Editor.
 *
 * 🧠 Responsibilities:
 * • copies only the closed decision fields for reached gate IDs;
 * • forwards explicit closure and preserves all owner failures.
 *
 * 🏗️ Architecture:
 * Root adapter between named published/consumer-owned contracts; no ORM or profile.
 *
 * ⚠️ Important:
 * This is an operation scope, never a shared or cross-request authorization cache.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Inject, Injectable } from '@nestjs/common';
import {
  CONTENT_GATE_DECISION_SCOPES,
  type ContentGateDecisionScopes,
} from '@api/modules/content-access';
import type {
  EditorGateDecisionScopes,
  EditorGateDecisionScope,
} from '@api/modules/editor';
@Injectable()
export class EditorGateDecisionScopesAdapter implements EditorGateDecisionScopes {
  constructor(
    @Inject(CONTENT_GATE_DECISION_SCOPES)
    private readonly scopes: ContentGateDecisionScopes,
  ) {}
  open(viewerId: string): EditorGateDecisionScope {
    const scope = this.scopes.open(viewerId);
    return {
      evaluate: async (gateId) => {
        const decision = await scope.evaluate(gateId);
        return {
          gateId: decision.gateId,
          allowed: decision.allowed,
          bypassed: decision.bypassed,
          unmet: [...decision.unmet],
          notice: decision.notice,
        };
      },
      close: () => scope.close(),
    };
  }
}
