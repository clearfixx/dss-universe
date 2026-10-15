/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users Profile Composition
 * 📄 File: apps/api/src/composition/users-profiles/users-profile-integration.module.ts
 *
 * 🎯 Purpose:
 * Binds owner-specific shared-row assembly and role display outside feature modules.
 *
 * 🧠 Responsibilities:
 * • publishes only consumer semantic tokens globally;
 * • keeps technical fragments and root persistence private to infrastructure/assembly.
 *
 * 🏗️ Architecture:
 * Explicit global composition bindings; no feature imports this root module.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '@api/core/database';
import {
  UsersModule,
  USERS_PROFILE_PERSISTENCE,
  PROFILE_ROLE_NAMES_READER,
} from '@api/modules/users';
import { IamModule } from '@api/modules/iam';
import { PrismaUsersProfilePersistence } from './infrastructure/prisma-users-profile.persistence';
import { ProfileRoleNamesAdapter } from './infrastructure/profile-role-names.adapter';
@Global()
@Module({
  imports: [PrismaModule, UsersModule, IamModule],
  providers: [
    {
      provide: USERS_PROFILE_PERSISTENCE,
      useClass: PrismaUsersProfilePersistence,
    },
    { provide: PROFILE_ROLE_NAMES_READER, useClass: ProfileRoleNamesAdapter },
  ],
  exports: [USERS_PROFILE_PERSISTENCE, PROFILE_ROLE_NAMES_READER],
})
export class UsersProfileIntegrationModule {}
