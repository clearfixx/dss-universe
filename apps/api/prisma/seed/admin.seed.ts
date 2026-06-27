import { PrismaClient } from '@prisma/client';

export async function seedAdmin(_prisma: PrismaClient) {
  console.log('Skipping admin seed: User model is not ready yet');
}
