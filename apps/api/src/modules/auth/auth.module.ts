/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/auth.module.ts
 *
 * 🎯 Purpose:
 * Wires the Authentication module dependency graph.
 *
 * 🧠 Responsibilities:
 * • registers the AuthController;
 * • registers authentication application services;
 * • imports Users, Core Auth, and Authorization dependencies.
 *
 * 🏗️ Architecture:
 * NestJS feature module.
 * Authentication handles login, registration, refresh, and logout.
 * Authorization remains a separate concern.
 *
 * ⚠️ Important:
 * Authentication ≠ Authorization.
 * Do not move permissions logic into this module.
 *
 * 💡 Notes:
 * If Nest cannot resolve dependencies,
 * check module imports before blaming the cosmos. 🛰️
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Module } from '@nestjs/common';

import { AuthCoreModule } from '@api/core/auth';
import { AuthorizationModule } from '@api/core/authorization';

import { UsersModule } from '../users/users.module';

import { AuthService } from './application/services/auth.service';
import { PasswordHashService } from './application/services/password-hash.service';
import { TokenService } from './application/services/token.service';
import { AuthController } from './presentation/controllers/auth.controller';
import { AuthResolver } from './presentation/graphql/resolvers/auth.resolver';

@Module({
  imports: [UsersModule, AuthCoreModule, AuthorizationModule],
  controllers: [AuthController],
  providers: [AuthService, PasswordHashService, TokenService, AuthResolver],
  exports: [AuthService],
})
export class AuthModule {}
