/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: IAM Persistence Composition
 * 📄 File: apps/api/src/modules/iam/infrastructure.ts
 *
 * 🎯 Purpose:
 * Publishes only the owned directory role predicate to guarded root infrastructure.
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
