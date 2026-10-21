/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Content Presentation Composition
 * 📄 File: apps/api/src/composition/content-presentation/presentation/graphql/content-gate.enums.ts
 *
 * 🎯 Purpose:
 * Registers the single wire enum identities used by existing content operations.
 *
 * 🏗️ Architecture:
 * Root transport composition; policy and persistence remain with owners.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { registerEnumType } from '@nestjs/graphql';
export enum ContentGateOperator {
  ALL = 'ALL',
  ANY = 'ANY',
}
export enum ContentGateRequirementKind {
  ACCOUNT_AGE_DAYS = 'ACCOUNT_AGE_DAYS',
  COMMENTS = 'COMMENTS',
  FORUM_POSTS = 'FORUM_POSTS',
  PUBLICATIONS = 'PUBLICATIONS',
  REPUTATION = 'REPUTATION',
  GROUP = 'GROUP',
}
registerEnumType(ContentGateOperator, { name: 'ContentGateOperator' });
registerEnumType(ContentGateRequirementKind, {
  name: 'ContentGateRequirementKind',
});
