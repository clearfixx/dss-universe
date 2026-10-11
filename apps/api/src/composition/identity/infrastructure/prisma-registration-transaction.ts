/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Identity Composition
 * 📄 File: apps/api/src/composition/identity/infrastructure/prisma-registration-transaction.ts
 *
 * 🎯 Purpose:
 * Atomically persists the shared identity/profile row and IAM baseline assignment.
 *
 * 🧠 Responsibilities:
 * • implements the Auth-owned write-only credential store for a bound profile;
 * • commits the combined row and IAM-owned default role together;
 * • returns only the opaque subject ID after commit.
 *
 * 🏗️ Architecture:
 * Composition-owned unit of work for the transitional shared physical row.
 *
 * ⚠️ Important:
 * No Prisma client crosses application ports. Hashes are never returned or logged.
 * Session creation and best-effort mail happen after this transaction commits.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@api/core/database';
import type { CredentialSubjectStore } from '@api/modules/auth';
import { REGISTRATION_ROLE_NAME } from '@api/modules/iam';
import type { RegistrationTransaction } from '../application/contracts/registration-transaction.contract';

@Injectable()
export class PrismaRegistrationTransaction implements RegistrationTransaction {
  constructor(private readonly prisma: PrismaService) {}
  forProfile(
    profile: Readonly<{ username: string; displayName?: string }>,
  ): CredentialSubjectStore {
    // Copy only intended fields; never retain a caller's mutable aggregate.
    const { username, displayName } = profile;
    return {
      create: (credentials) =>
        this.prisma.$transaction(async (transaction) => {
          const role = await transaction.role.findUniqueOrThrow({
            where: { name: REGISTRATION_ROLE_NAME },
            select: { id: true },
          });
          const subject = await transaction.user.create({
            data: {
              email: credentials.email,
              passwordHash: credentials.passwordHash,
              username,
              displayName,
            },
            select: { id: true },
          });
          await transaction.userRole.create({
            data: { userId: subject.id, roleId: role.id },
          });
          return subject.id;
        }),
    };
  }
}
