import { PrismaClient } from '@prisma/client';

export async function seedSettings(_prisma: PrismaClient) {
  console.log('Skipping settings seed: Setting model is not ready yet');
}
