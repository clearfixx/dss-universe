/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: IAM Persistence Composition
 * 📄 File: apps/api/src/modules/iam/infrastructure.ts
 *
 * 🎯 Purpose:
 * Publishes owned directory fragments and stateless writers to guarded root infrastructure.
 *
 * 🧠 Responsibilities:
 * • keeps technical Prisma fragments out of the normal business entry.
 *
 * 🏗️ Architecture:
 * Guarded ADR-004 technical entry; never imported by foreign feature applications.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export { profileDirectoryRole } from './infrastructure/repositories/prisma-profile-role.shape';
export { PrismaMembershipGrantWriter } from './infrastructure/repositories/prisma-membership-grant.writer';
export { PrismaRoleRevocationWriter } from './infrastructure/repositories/prisma-role-revocation.writer';
export {
  iamAssignmentSelect,
  mapIamAssignments,
} from './infrastructure/repositories/prisma-assignment.shape';
export {
  iamAuthorizationSelect,
  mapAuthorizationAssignmentFacts,
} from './infrastructure/repositories/authorization-assignment.shape';
