/**
 * ===============================================================
 * 🚀 DSS Universe Seed Entry
 * ---------------------------------------------------------------
 * Єдина точка запуску seed-процесу.
 *
 * 🧠 Правило:
 * Один PrismaClient на весь seed.
 * Не плодимо клієнтів, бо Prisma — не кролик. 🐇
 * ===============================================================
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

import { seedDatabase } from './seed/index';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  console.log('🌱 Starting database seed...\n');

  await seedDatabase(prisma);

  console.log('\n✅ Database seed completed');
}

main()
  .catch((error) => {
    console.error('❌ Database seed failed');
    console.error(error);

    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
