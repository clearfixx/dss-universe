/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Identity Composition
 * 📄 File: apps/api/src/composition/identity/identity-composition.module.ts
 *
 * 🎯 Purpose:
 * Wires compatibility adapters across identity owners outside feature modules.
 *
 * 🧠 Responsibilities:
 * • supplies the Auth-owned access-token issuance token;
 * • connects Users display and Authorization access capabilities explicitly.
 * • supplies current request access after authoritative session validation.
 *
 * 🏗️ Architecture:
 * Root-installed global bindings module; no feature imports this composition root.
 *
 * ⚠️ Important:
 * Global visibility is only for the narrow token, not feature services or storage.
 * Do not import AuthModule here and create a feature/composition dependency cycle.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Global, Module } from '@nestjs/common';
import { AuthCoreModule, REQUEST_ACCESS_READER } from '@api/core/auth';
import { AuthorizationModule } from '@api/core/authorization';
import { ACCESS_TOKEN_ISSUER } from '@api/modules/auth';
import { UsersModule } from '@api/modules/users';
import { LegacyAccessTokenIssuer } from './infrastructure/legacy-access-token-issuer';
import { AuthoritativeRequestAccessReader } from './infrastructure/authoritative-request-access-reader';

@Global()
@Module({
  imports: [AuthCoreModule, AuthorizationModule, UsersModule],
  providers: [
    { provide: ACCESS_TOKEN_ISSUER, useClass: LegacyAccessTokenIssuer },
    {
      provide: REQUEST_ACCESS_READER,
      useClass: AuthoritativeRequestAccessReader,
    },
  ],
  exports: [ACCESS_TOKEN_ISSUER, REQUEST_ACCESS_READER],
})
export class IdentityCompositionModule {}
