/**
 * DSS File Passport 🛰️
 * File: apps/api/prisma/seed/users.seed.ts
 * Purpose: Seeds base DSS users.
 * Phase: 2.4.5 — RBAC Core Migration
 * Architecture: Database seed
 *
 * Notes:
 * - Users no longer own enum roles directly.
 * - Roles are assigned through user_roles. Much cleaner. Much less cursed. ☕
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const ADMIN_EMAIL = 'admin@dss.local';
const USER_EMAIL = 'user@dss.local';

export async function seedUsers(prisma: PrismaClient): Promise<void> {
  const adminRole = await prisma.role.upsert({
    where: { name: 'admin' },
    update: {},
    create: {
      name: 'admin',
      label: 'Administrator',
      description: 'System administrator role.',
      isSystem: true,
    },
  });

  const userRole = await prisma.role.upsert({
    where: { name: 'user' },
    update: {},
    create: {
      name: 'user',
      label: 'User',
      description: 'Default user role.',
      isSystem: true,
    },
  });

  const passwordHash = await bcrypt.hash('Password123!', 10);

  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {
      username: 'admin',
      displayName: 'DSS Admin',
      passwordHash,
    },
    create: {
      email: ADMIN_EMAIL,
      username: 'admin',
      displayName: 'DSS Admin',
      passwordHash,
    },
  });

  const user = await prisma.user.upsert({
    where: { email: USER_EMAIL },
    update: {
      username: 'user',
      displayName: 'DSS User',
      passwordHash,
    },
    create: {
      email: USER_EMAIL,
      username: 'user',
      displayName: 'DSS User',
      passwordHash,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: admin.id,
        roleId: adminRole.id,
      },
    },
    update: {},
    create: {
      userId: admin.id,
      roleId: adminRole.id,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: user.id,
        roleId: userRole.id,
      },
    },
    update: {},
    create: {
      userId: user.id,
      roleId: userRole.id,
    },
  });

  console.log('Users seeded');
}
