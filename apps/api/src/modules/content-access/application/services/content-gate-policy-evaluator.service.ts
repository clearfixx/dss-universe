/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Content Access
 * 📄 File: apps/api/src/modules/content-access/application/services/content-gate-policy-evaluator.service.ts
 *
 * 🎯 Purpose:
 * Delegates management policy evaluation without exposing private viewer scopes.
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
import type { ContentGatePolicyEvaluator } from '../../contracts/content-gate-policy-evaluator.contract';
import type { ContentGatePolicyEvaluation } from '../../contracts/content-gate-policy-view.type';
import { ContentGatesService } from './content-gates.service';
@Injectable()
export class ContentGatePolicyEvaluatorService implements ContentGatePolicyEvaluator {
  constructor(private readonly gates: ContentGatesService) {}
  evaluate(
    gateId: string,
    viewerId: string,
  ): Promise<ContentGatePolicyEvaluation> {
    return this.gates.evaluate(gateId, viewerId);
  }
}
