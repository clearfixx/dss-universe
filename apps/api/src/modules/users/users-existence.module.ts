/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/users-existence.module.ts
 *
 * 🎯 Purpose:
 * Publishes profile existence without loading Users presentation providers.
 *
 * 🧠 Responsibilities:
 * • aliases the shared private profile reader;
 * • exports only the existing ID-to-boolean contract.
 *
 * 🏗️ Architecture:
 * Minimal Users runtime assembly.
 *
 * ⚠️ Important:
 * No profile fields, Auth status, resolver, controller or presence interceptor is exposed.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Module } from '@nestjs/common';
import { PROFILE_EXISTENCE_READER } from './contracts/profile-existence.contract';
import {
  ProfileExistenceProvidersModule,
  USERS_INTERNAL_PROFILE_EXISTENCE_READER,
} from './profile-existence-providers.module';

@Module({
  imports: [ProfileExistenceProvidersModule],
  providers: [
    {
      provide: PROFILE_EXISTENCE_READER,
      useExisting: USERS_INTERNAL_PROFILE_EXISTENCE_READER,
    },
  ],
  exports: [PROFILE_EXISTENCE_READER],
})
export class UsersExistenceModule {}
