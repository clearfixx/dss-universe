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
import { APP_INTERCEPTOR } from '@nestjs/core';

import { PrismaModule } from '@api/core/database';

import { UsersService } from './application/services/users.service';
import { USERS_REPOSITORY } from './domain/repositories/users.repository.interface';
import { PrismaUsersRepository } from './infrastructure/repositories/prisma-users.repository';
import { UsersController } from './presentation/controllers/users.controller';
import { UsersResolver } from './presentation/graphql/resolvers/users.resolver';
import { UserSocialLinksService } from './application/services/user-social-links.service';
import { USER_SOCIAL_LINKS_REPOSITORY } from './domain/repositories/user-social-links.repository.interface';
import { PrismaUserSocialLinksRepository } from './infrastructure/repositories/prisma-user-social-links.repository';
import { UserSocialLinksLoader } from './presentation/graphql/loaders/user-social-links.loader';
import { UserPrivacyService } from './application/services/user-privacy.service';
import { USER_PRIVACY_REPOSITORY } from './domain/repositories/user-privacy.repository.interface';
import { PrismaUserPrivacyRepository } from './infrastructure/repositories/prisma-user-privacy.repository';
import { UserSocialGraphService } from './application/services/user-social-graph.service';
import { USER_SOCIAL_GRAPH_REPOSITORY } from './domain/repositories/user-social-graph.repository.interface';
import { PrismaUserSocialGraphRepository } from './infrastructure/repositories/prisma-user-social-graph.repository';
import { UserSocialGraphLoader } from './presentation/graphql/loaders/user-social-graph.loader';
import { UserBlockService } from './application/services/user-block.service';
import { USER_BLOCK_REPOSITORY } from './domain/repositories/user-block.repository.interface';
import { PrismaUserBlockRepository } from './infrastructure/repositories/prisma-user-block.repository';
import { UserPresenceService } from './application/services/user-presence.service';
import { UserPresenceInterceptor } from './presentation/interceptors/user-presence.interceptor';
import { UserWallService } from './application/services/user-wall.service';
import { USER_WALL_REPOSITORY } from './domain/repositories/user-wall.repository.interface';
import { PrismaUserWallRepository } from './infrastructure/repositories/prisma-user-wall.repository';
import { ProfileCompletionService } from './application/services/profile-completion.service';
import { ActivityModule } from '../activity';
import { UserActivityFeedService } from './application/services/user-activity-feed.service';
import { InteractionsModule } from '../interactions';
import { ProfileWallInteractionPolicy } from './application/services/profile-wall-interaction.policy';

@Module({
  imports: [PrismaModule, ActivityModule, InteractionsModule],
  controllers: [UsersController],
  providers: [
    UsersService,
    UsersResolver,
    UserSocialLinksService,
    UserSocialLinksLoader,
    UserPrivacyService,
    UserSocialGraphService,
    UserSocialGraphLoader,
    UserBlockService,
    UserPresenceService,
    UserWallService,
    ProfileCompletionService,
    UserActivityFeedService,
    ProfileWallInteractionPolicy,
    {
      provide: APP_INTERCEPTOR,
      useClass: UserPresenceInterceptor,
    },
    {
      provide: USERS_REPOSITORY,
      useClass: PrismaUsersRepository,
    },
    {
      provide: USER_SOCIAL_LINKS_REPOSITORY,
      useClass: PrismaUserSocialLinksRepository,
    },
    {
      provide: USER_PRIVACY_REPOSITORY,
      useClass: PrismaUserPrivacyRepository,
    },
    {
      provide: USER_SOCIAL_GRAPH_REPOSITORY,
      useClass: PrismaUserSocialGraphRepository,
    },
    {
      provide: USER_BLOCK_REPOSITORY,
      useClass: PrismaUserBlockRepository,
    },
    {
      provide: USER_WALL_REPOSITORY,
      useClass: PrismaUserWallRepository,
    },
  ],
  exports: [
    UsersService,
    UserPrivacyService,
    UserBlockService,
    USERS_REPOSITORY,
  ],
})
export class UsersModule {}

/**
 * -----------------------------------------------------------------------------
 * 🛰️ Every module is a docking port.
 * Bad wiring creates space debris.
 * -----------------------------------------------------------------------------
 */
