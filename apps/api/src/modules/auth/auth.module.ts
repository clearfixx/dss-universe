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
 * • imports Core Auth and Authorization dependencies, never Users;
 * • binds the Core JWT strategy to the Auth-owned session validation capability.
 *
 * 🏗️ Architecture:
 * NestJS feature module.
 * Authentication handles credentials, sessions and opaque authentication flows.
 * Combined profile-bearing transport is wired in IdentityPresentationModule.
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

import {
  ACCESS_SESSION_VALIDATOR,
  AuthCoreModule,
  JwtStrategy,
} from '@api/core/auth';
import { AuthorizationModule } from '@api/core/authorization';

import { AUTHENTICATION_FLOWS } from './contracts/authentication-flows.contract';

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
import { AccessSessionValidationService } from './application/services/access-session-validation.service';
import { ACCESS_SESSION_REPOSITORY } from './domain/repositories/access-session.repository.interface';
import { PrismaAccessSessionRepository } from './infrastructure/repositories/prisma-access-session.repository';
import { ACCOUNT_CREDENTIALS_REPOSITORY } from './domain/repositories/account-credentials.repository.interface';
import { PrismaAccountCredentialsRepository } from './infrastructure/repositories/prisma-account-credentials.repository';

@Module({
  imports: [AuthCoreModule, AuthorizationModule],
  controllers: [AuthController],
  providers: [
    JwtStrategy,
    {
      provide: ACCOUNT_CREDENTIALS_REPOSITORY,
      useClass: PrismaAccountCredentialsRepository,
    },
    AccessSessionValidationService,
    {
      provide: ACCESS_SESSION_VALIDATOR,
      useExisting: AccessSessionValidationService,
    },
    {
      provide: ACCESS_SESSION_REPOSITORY,
      useClass: PrismaAccessSessionRepository,
    },
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
    { provide: AUTHENTICATION_FLOWS, useExisting: AuthService },
    PasswordHashService,
    TokenService,
    AuthSessionService,
    AuthResolver,
    {
      provide: AUTH_SESSION_REPOSITORY,
      useClass: PrismaAuthSessionRepository,
    },
  ],
  exports: [AUTHENTICATION_FLOWS],
})
export class AuthModule {}
