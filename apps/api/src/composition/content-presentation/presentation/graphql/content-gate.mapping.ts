/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Content Presentation Composition
 * 📄 File: apps/api/src/composition/content-presentation/presentation/graphql/content-gate.mapping.ts
 *
 * 🎯 Purpose:
 * Maps owner facts to existing GraphQL values without introducing access policy.
 *
 * 🏗️ Architecture:
 * Root transport composition; policy and persistence remain with owners.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type {
  ContentGatePolicyOperator,
  ContentGatePolicyRequirement,
  ContentGatePolicyView,
} from '@api/modules/content-access';
import {
  ContentGateOperator,
  ContentGateRequirementKind,
} from './content-gate.enums';
import type { ContentGateModel } from './content-gate.model';
const operators: Record<ContentGatePolicyOperator, ContentGateOperator> = {
  ALL: ContentGateOperator.ALL,
  ANY: ContentGateOperator.ANY,
};
const kinds: Record<
  ContentGatePolicyRequirement['kind'],
  ContentGateRequirementKind
> = {
  ACCOUNT_AGE_DAYS: ContentGateRequirementKind.ACCOUNT_AGE_DAYS,
  COMMENTS: ContentGateRequirementKind.COMMENTS,
  FORUM_POSTS: ContentGateRequirementKind.FORUM_POSTS,
  PUBLICATIONS: ContentGateRequirementKind.PUBLICATIONS,
  REPUTATION: ContentGateRequirementKind.REPUTATION,
  GROUP: ContentGateRequirementKind.GROUP,
};
export function toContentGateRequirementKind(
  kind: ContentGatePolicyRequirement['kind'],
): ContentGateRequirementKind {
  return kinds[kind];
}
export function toContentGateModel(
  gate: ContentGatePolicyView,
): ContentGateModel {
  return {
    id: gate.id,
    ownerId: gate.ownerId,
    operator: operators[gate.operator],
    requirements: gate.requirements.map(
      ({ id, kind, threshold, groupKey }) => ({
        id,
        kind: toContentGateRequirementKind(kind),
        threshold,
        groupKey,
      }),
    ),
    createdAt: gate.createdAt,
    updatedAt: gate.updatedAt,
  };
}
