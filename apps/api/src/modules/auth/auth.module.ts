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
import { PasswordRecoveryService } from './application/services/password-recovery.service';
import { PrismaPasswordResetRepository } from './infrastructure/repositories/prisma-password-reset.repository';
import { PasswordRecoveryResolver } from './presentation/graphql/resolvers/password-recovery.resolver';

import { AuthCoreModule } from '@api/core/auth';
import { AuthorizationModule } from '@api/core/authorization';

import { UsersModule } from '../users/users.module';

import { AuthService } from './application/services/auth.service';
import { PasswordHashService } from './application/services/password-hash.service';
import { TokenService } from './application/services/token.service';
import { AuthController } from './presentation/controllers/auth.controller';
import { AuthResolver } from './presentation/graphql/resolvers/auth.resolver';
import { AuthSessionService } from './application/services/auth-session.service';
import { AUTH_SESSION_REPOSITORY } from './domain/repositories/auth-session.repository.interface';
import { PrismaAuthSessionRepository } from './infrastructure/repositories/prisma-auth-session.repository';
import { EmailVerificationService } from './application/services/email-verification.service';
import { PrismaEmailVerificationRepository } from './infrastructure/repositories/prisma-email-verification.repository';
import { EmailVerificationResolver } from './presentation/graphql/resolvers/email-verification.resolver';
import { LoginAbuseProtectionService } from './application/services/login-abuse-protection.service';
import { SecurityAlertService } from './application/services/security-alert.service';
import { TotpService } from './application/services/totp.service';
import { TwoFactorService } from './application/services/two-factor.service';
import { TwoFactorResolver } from './presentation/graphql/resolvers/two-factor.resolver';

@Module({
  imports: [UsersModule, AuthCoreModule, AuthorizationModule],
  controllers: [AuthController],
  providers: [
    PasswordRecoveryService,
    PrismaPasswordResetRepository,
    PasswordRecoveryResolver,
    EmailVerificationService,
    PrismaEmailVerificationRepository,
    EmailVerificationResolver,
    LoginAbuseProtectionService,
    SecurityAlertService,
    TotpService,
    TwoFactorService,
    TwoFactorResolver,
    AuthService,
    PasswordHashService,
    TokenService,
    AuthSessionService,
    AuthResolver,
    {
      provide: AUTH_SESSION_REPOSITORY,
      useClass: PrismaAuthSessionRepository,
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}
