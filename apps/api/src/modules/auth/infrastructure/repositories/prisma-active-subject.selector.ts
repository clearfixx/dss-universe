/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication Persistence
 * 📄 File: apps/api/src/modules/auth/infrastructure/repositories/prisma-active-subject.selector.ts
 *
 * 🎯 Purpose:
 * Defines the owned ACTIVE opaque-subject projection for guarded atomic SQL composition.
 *
 * 🧠 Responsibilities:
 * • selects IDs using the existing minimal account eligibility state;
 * • keeps public handles and all credentials outside this projection.
 *
 * 🏗️ Architecture:
 * Infrastructure-only subject selector; no Users import or business-facing SQL contract.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

@Injectable()
export class PrismaActiveSubjectSelector {
  activeIds(): Prisma.Sql {
    return Prisma.sql`SELECT "id" FROM "users" WHERE "status" = 'ACTIVE'`;
  }
}
