/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 🌱 Module: Database Seed
 * 📄 File: index.ts
 *
 * 🎯 Purpose:
 * Mission Control for the database seed process.
 *
 * 🧠 Responsibilities:
 * • controls seed execution order;
 * • passes one PrismaClient to child seed files;
 * • keeps database initialization predictable.
 *
 * 🏗️ Architecture:
 * Database seed orchestrator.
 *
 * Seed entrypoint
 *   ↓
 * Seed mission
 *   ↓
 * Individual seed files
 *   ↓
 * PostgreSQL
 *
 * ⚠️ Important:
 * System data must be created before users.
 *
 * 💡 Notes:
 * Never change seed order without coffee and a good reason. 🛰️
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { PrismaClient } from '@prisma/client';

import { seedPermissions } from './permissions.seed';
import { seedRolePermissions } from './role-permissions.seed';
import { seedRoles } from './roles.seed';
import { seedUsers } from './users.seed';

export async function seedDatabase(prisma: PrismaClient) {
  console.log('🛰️ Running seed mission...\n');

  await seedPermissions(prisma);
  await seedRoles(prisma);
  await seedRolePermissions(prisma);

  await seedUsers(prisma);
}
