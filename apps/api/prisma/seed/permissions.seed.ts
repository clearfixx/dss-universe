/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 🌱 Module: Database Seed
 * 📄 File: permissions.seed.ts
 *
 * 🎯 Purpose:
 * Seeds the base permission registry into the database.
 *
 * 🧠 Responsibilities:
 * • reads permission definitions from Authorization Core;
 * • creates missing permissions;
 * • updates existing permission labels and descriptions.
 *
 * 🏗️ Architecture:
 * Database seed.
 *
 * Permission Registry
 *   ↓
 * permissions.seed.ts
 *   ↓
 * Permission table
 *
 * ⚠️ Important:
 * Permission keys are backend authorization contracts.
 * Rename them carefully.
 *
 * 💡 Notes:
 * Tiny strings.
 * Very real doors. 🔑
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { PrismaClient } from '@prisma/client';

import { PERMISSION_LIST } from '../../src/core/authorization';

export async function seedPermissions(prisma: PrismaClient) {
  console.log('🔑 Seeding permissions...');

  for (const permission of PERMISSION_LIST) {
    await prisma.permission.upsert({
      where: {
        key: permission.key,
      },
      update: {
        label: permission.label,
        description: permission.description,
      },
      create: {
        key: permission.key,
        label: permission.label,
        description: permission.description,
      },
    });
  }

  console.log(`✅ Permissions seeded: ${PERMISSION_LIST.length}`);
}
