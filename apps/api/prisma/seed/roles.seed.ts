/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 🌱 Module: Database Seed
 * 📄 File: roles.seed.ts
 *
 * 🎯 Purpose:
 * Seeds base system roles for DSS Universe.
 *
 * 🧠 Responsibilities:
 * • creates lowercase system roles;
 * • updates system role labels and descriptions;
 * • removes legacy uppercase role records.
 *
 * 🏗️ Architecture:
 * Database seed.
 *
 * Role definitions
 *   ↓
 * roles.seed.ts
 *   ↓
 * Role table
 *
 * ⚠️ Important:
 * Role names are lowercase identifiers.
 * Labels are human-readable names.
 *
 * 💡 Notes:
 * If role names start yelling in CAPS again,
 * the seed is probably haunted. 👻
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
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
