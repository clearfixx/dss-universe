/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Database Seed
 * 📄 File: index.ts
 *
 * 🎯 Purpose:
 * Mission Control для seed-процесу.
 *
 * 🧠 Responsibilities:
 * • керує порядком виконання seed-файлів;
 * • передає один PrismaClient усім дочірнім seed'ам;
 * • тримає seed-процес передбачуваним.
 *
 * ⚠️ Important:
 * Системні дані мають створюватися до користувачів.
 *
 * 🛰️ Не міняй порядок без кави й вагомої причини.
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
