/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/users.module.ts
 *
 * 🎯 Purpose:
 * Declares the Users module and wires its internal dependencies.
 *
 * 🧠 Responsibilities:
 * • registers the UsersController;
 * • registers UsersService;
 * • binds the UsersRepository contract to PrismaUsersRepository.
 *
 * 🏗️ Architecture:
 * NestJS feature module. Owns the Users module dependency graph.
 *
 * ⚠️ Important:
 * Keep module wiring explicit. Do not hide dependencies behind magic exports.
 *
 * 💡 Notes:
 * Modules are docking ports. Keep the connection clean. 🛰️
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Module } from '@nestjs/common';

import { PrismaModule } from '@api/core/database';

import { UsersService } from './application/services/users.service';
import { USERS_REPOSITORY } from './domain/repositories/users.repository.interface';
import { PrismaUsersRepository } from './infrastructure/repositories/prisma-users.repository';
import { UsersController } from './presentation/controllers/users.controller';
import { UserByIdLoader } from './presentation/graphql/loaders/user-by-id.loader';
import { UsersResolver } from './presentation/graphql/resolvers/users.resolver';
import { UserSocialLinksService } from './application/services/user-social-links.service';
import { USER_SOCIAL_LINKS_REPOSITORY } from './domain/repositories/user-social-links.repository.interface';
import { PrismaUserSocialLinksRepository } from './infrastructure/repositories/prisma-user-social-links.repository';
import { UserSocialLinksLoader } from './presentation/graphql/loaders/user-social-links.loader';

@Module({
  imports: [PrismaModule],
  controllers: [UsersController],
  providers: [
    UsersService,
    UsersResolver,
    UserByIdLoader,
    UserSocialLinksService,
    UserSocialLinksLoader,
    {
      provide: USERS_REPOSITORY,
      useClass: PrismaUsersRepository,
    },
    {
      provide: USER_SOCIAL_LINKS_REPOSITORY,
      useClass: PrismaUserSocialLinksRepository,
    },
  ],
  exports: [UsersService, USERS_REPOSITORY],
})
export class UsersModule {}

/**
 * -----------------------------------------------------------------------------
 * 🛰️ Every module is a docking port.
 * Bad wiring creates space debris.
 * -----------------------------------------------------------------------------
 */
