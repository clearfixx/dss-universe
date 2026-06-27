import * as bcrypt from 'bcrypt';

import { UserRole } from '@prisma/client';

import { prisma } from '../client';

import { PrismaClient } from '@prisma/client';

/**
 * Створює базових користувачів для локальної розробки.
 */
export async function seedUsers(prisma: PrismaClient) {
  console.log('🌱 Seeding users...');

  const adminPasswordHash = await bcrypt.hash('Admin123!', 10);
  const userPasswordHash = await bcrypt.hash('User123!', 10);

  // ---------------------------------------------------------------------------
  // Administrator
  // ---------------------------------------------------------------------------

  await prisma.user.upsert({
    where: {
      email: 'admin@dss.local',
    },
    update: {
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
      displayName: 'Administrator',
    },
    create: {
      email: 'admin@dss.local',
      username: 'admin',
      displayName: 'Administrator',
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
    },
  });

  // ---------------------------------------------------------------------------
  // Regular user
  // ---------------------------------------------------------------------------

  await prisma.user.upsert({
    where: {
      email: 'user@dss.local',
    },
    update: {
      passwordHash: userPasswordHash,
      role: UserRole.USER,
      displayName: 'Regular User',
    },
    create: {
      email: 'user@dss.local',
      username: 'user',
      displayName: 'Regular User',
      passwordHash: userPasswordHash,
      role: UserRole.USER,
    },
  });

  console.log('✅ Users seeded');
}
