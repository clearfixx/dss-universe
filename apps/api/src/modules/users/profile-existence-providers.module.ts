/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/profile-existence-providers.module.ts
 *
 * 🎯 Purpose:
 * Shares one ID-only profile reader across API and existence-only assemblies.
 *
 * 🧠 Responsibilities:
 * • owns one profile existence reader instance;
 * • keeps the internal token outside the public index.
 *
 * 🏗️ Architecture:
 * Private Users provider assembly.
 *
 * ⚠️ Important:
 * Existence is not ACTIVE eligibility; the existing reader remains unchanged.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Module } from '@nestjs/common';
import { PrismaModule } from '@api/core/database';
import { PrismaProfileExistenceReader } from './infrastructure/repositories/prisma-profile-existence.reader';

export const USERS_INTERNAL_PROFILE_EXISTENCE_READER = Symbol(
  'USERS_INTERNAL_PROFILE_EXISTENCE_READER',
);

@Module({
  imports: [PrismaModule],
  providers: [
    {
      provide: USERS_INTERNAL_PROFILE_EXISTENCE_READER,
      useClass: PrismaProfileExistenceReader,
    },
  ],
  exports: [USERS_INTERNAL_PROFILE_EXISTENCE_READER],
})
export class ProfileExistenceProvidersModule {}
