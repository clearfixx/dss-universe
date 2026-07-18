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

@Module({
  imports: [PrismaModule],
  controllers: [UsersController],
  providers: [
    UsersService,
    UsersResolver,
    UserByIdLoader,
    {
      provide: USERS_REPOSITORY,
      useClass: PrismaUsersRepository,
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
