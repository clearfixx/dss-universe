/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 🌱 Module: Database Seed
 * 📄 File: users.seed.ts
 *
 * 🎯 Purpose:
 * Seeds base DSS development users.
 *
 * 🧠 Responsibilities:
 * • creates default admin and user accounts;
 * • hashes development passwords;
 * • assigns default roles through user-role relations.
 *
 * 🏗️ Architecture:
 * Database seed.
 *
 * Users
 *   ↓
 * UserRole
 *   ↓
 * Role
 *
 * ⚠️ Important:
 * Users no longer own enum roles directly.
 * Roles are assigned through user-role relations.
 *
 * 💡 Notes:
 * Default users are for development.
 * Production should not trust seed comfort food. 🍪
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
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
