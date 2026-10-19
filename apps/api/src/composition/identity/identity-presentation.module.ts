/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Identity Composition
 * 📄 File: apps/api/src/composition/identity/identity-presentation.module.ts
 *
 * 🎯 Purpose:
 * Wires registration and profile-bearing transport across explicit owner contracts.
 *
 * 🧠 Responsibilities:
 * • imports Auth/Users capabilities and root token bindings;
 * • binds the composition-owned atomic registration unit of work;
 * • registers the existing combined REST/GraphQL operations.
 *
 * 🏗️ Architecture:
 * Root-installed presentation composition, never imported by feature modules.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Module } from '@nestjs/common';
import { AuthModule } from '@api/modules/auth';
import { UsersModule } from '@api/modules/users';
import { PrismaRegistrationRoleWriter } from '@api/modules/iam/infrastructure';
import { IdentityCompositionModule } from './identity-composition.module';
import { AuthenticationPresentationService } from './application/authentication-presentation.service';
import { REGISTRATION_TRANSACTION } from './application/contracts/registration-transaction.contract';
import { PrismaRegistrationTransaction } from './infrastructure/prisma-registration-transaction';
import { AuthenticationController } from './presentation/authentication.controller';
import { AuthenticationResolver } from './presentation/graphql/authentication.resolver';

@Module({
  imports: [AuthModule, UsersModule, IdentityCompositionModule],
  providers: [
    PrismaRegistrationRoleWriter,
    AuthenticationPresentationService,
    AuthenticationResolver,
    {
      provide: REGISTRATION_TRANSACTION,
      useClass: PrismaRegistrationTransaction,
    },
  ],
  controllers: [AuthenticationController],
})
export class IdentityPresentationModule {}
