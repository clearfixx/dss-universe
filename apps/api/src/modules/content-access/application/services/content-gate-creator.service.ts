/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Content Access
 * 📄 File: apps/api/src/modules/content-access/application/services/content-gate-creator.service.ts
 *
 * 🎯 Purpose:
 * Delegates policy creation to Content Access validation through a single command.
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
import type { ContentGateCreator } from '../../contracts/content-gate-creator.contract';
import type {
  ContentGatePolicyCreation,
  ContentGatePolicyView,
} from '../../contracts/content-gate-policy-view.type';
import { ContentGatesService } from './content-gates.service';
@Injectable()
export class ContentGateCreatorService implements ContentGateCreator {
  constructor(private readonly gates: ContentGatesService) {}
  create(input: ContentGatePolicyCreation): Promise<ContentGatePolicyView> {
    return this.gates.create({
      ownerId: input.ownerId,
      operator: input.operator,
      requirements: input.requirements.map(({ kind, threshold, groupKey }) => ({
        kind,
        threshold,
        groupKey,
      })),
    });
  }
}
