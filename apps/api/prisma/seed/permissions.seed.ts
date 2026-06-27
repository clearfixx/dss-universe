/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Database Seed
 * 📄 File: permissions.seed.ts
 *
 * 🎯 Purpose:
 * Синхронізує системні permission'и з базою даних.
 *
 * 🧠 Rule:
 * Permission Registry = єдине джерело правди.
 * Seed не вигадує права, а лише переносить їх у БД.
 *
 * ☕ Якщо permission не з'явився в базі —
 * перевір registry, а не звинувачуй PostgreSQL. 😄
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
