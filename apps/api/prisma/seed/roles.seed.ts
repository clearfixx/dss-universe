/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Database Seed
 * 📄 File: roles.seed.ts
 *
 * 🎯 Purpose:
 * Створює базові системні ролі DSS Universe.
 *
 * 🧠 Rule:
 * Роль = "погон".
 * Permission = що реально дозволено з цим погоном робити.
 *
 * 🎖️ Не кожен із погоном — адмірал.
 * Але OWNER точно сидить у Mission Control. 😄
 * ===============================================================
 */

/**
 * DSS File Passport 🛰️
 * File: apps/api/prisma/seed/roles.seed.ts
 * Purpose: Seeds base system roles for DSS Universe.
 * Phase: 2.5 — Roles & Permission Management
 * Architecture: Database seed
 *
 * Notes:
 * - Role names are lowercase system identifiers.
 * - Labels are human-readable names.
 * - If role names start yelling in CAPS again, the seed is haunted. 👻
 */

import { PrismaClient } from '@prisma/client';

const ROLES = [
  {
    name: 'user',
    label: 'User',
    description: 'Default registered user.',
    isSystem: true,
  },
  {
    name: 'moderator',
    label: 'Moderator',
    description: 'Community moderation role.',
    isSystem: true,
  },
  {
    name: 'admin',
    label: 'Administrator',
    description: 'System administration role.',
    isSystem: true,
  },
  {
    name: 'owner',
    label: 'Owner',
    description: 'Highest system role with full access.',
    isSystem: true,
  },
];

export async function seedRoles(prisma: PrismaClient): Promise<void> {
  console.log('Seeding roles...');

  await cleanupLegacyUppercaseRoles(prisma);

  for (const role of ROLES) {
    await prisma.role.upsert({
      where: {
        name: role.name,
      },
      update: {
        label: role.label,
        description: role.description,
        isSystem: role.isSystem,
      },
      create: role,
    });
  }

  console.log(`Roles seeded: ${ROLES.length}`);
}

async function cleanupLegacyUppercaseRoles(
  prisma: PrismaClient,
): Promise<void> {
  const legacyRoleNames = ['USER', 'MODERATOR', 'ADMIN', 'OWNER'];

  await prisma.role.deleteMany({
    where: {
      name: {
        in: legacyRoleNames,
      },
    },
  });
}
