/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Content Access
 * 📄 File: apps/api/src/modules/content-access/application/services/content-gate-decisions.service.ts
 *
 * 🎯 Purpose:
 * Projects an owned gate evaluation into a minimal public access verdict.
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
import { Injectable } from '@nestjs/common';
import type {
  ContentGateDecisions,
  ContentGateDecision,
} from '../../contracts/content-gate-decisions.contract';
import { ContentGatesService } from './content-gates.service';
import type {
  ContentGateDecisionScopes,
  ContentGateDecisionScope,
} from '../../contracts/content-gate-decision-scopes.contract';
import type { ContentGateEvaluation } from '../../domain/types/content-gate.type';

@Injectable()
export class ContentGateDecisionsService
  implements ContentGateDecisions, ContentGateDecisionScopes
{
  constructor(private readonly gates: ContentGatesService) {}
  async evaluate(
    gateId: string,
    viewerId: string | null,
  ): Promise<ContentGateDecision> {
    const evaluation = await this.gates.evaluate(gateId, viewerId);
    return this.present(evaluation);
  }

  open(viewerId: string): ContentGateDecisionScope {
    const scope = this.gates.openViewerScope(viewerId);
    return {
      evaluate: async (gateId) => this.present(await scope.evaluate(gateId)),
      close: () => scope.close(),
    };
  }

  private present(evaluation: ContentGateEvaluation): ContentGateDecision {
    return {
      gateId: evaluation.gate.id,
      allowed: evaluation.allowed,
      bypassed: evaluation.bypassed,
      unmet: [...evaluation.unmet],
      notice: evaluation.notice,
    };
  }
}
