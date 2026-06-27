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

import { PrismaClient } from '@prisma/client';

const ROLES = [
  {
    name: 'USER',
    label: 'User',
    description: 'Default registered user.',
  },
  {
    name: 'MODERATOR',
    label: 'Moderator',
    description: 'Community moderation role.',
  },
  {
    name: 'ADMIN',
    label: 'Administrator',
    description: 'System administration role.',
  },
  {
    name: 'OWNER',
    label: 'Owner',
    description: 'Highest system role with full access.',
  },
];

export async function seedRoles(prisma: PrismaClient) {
  console.log('🎖️ Seeding roles...');

  for (const role of ROLES) {
    await prisma.role.upsert({
      where: {
        name: role.name,
      },
      update: {
        label: role.label,
        description: role.description,
      },
      create: role,
    });
  }

  console.log(`✅ Roles seeded: ${ROLES.length}`);
}
