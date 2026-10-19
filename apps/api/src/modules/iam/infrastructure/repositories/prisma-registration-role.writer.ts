/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: IAM
 * 📄 File: apps/api/src/modules/iam/infrastructure/repositories/prisma-registration-role.writer.ts
 *
 * 🎯 Purpose:
 * Owns baseline role persistence inside the root registration transaction.
 *
 * 🧠 Responsibilities:
 * • resolves the existing registration role;
 * • assigns it to an opaque subject ID.
 *
 * 🏗️ Architecture:
 * Stateless infrastructure writer; root owns transaction lifetime and ordering.
 *
 * ⚠️ Important:
 * No profile, credentials, new audit policy or transaction options belong here.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Injectable } from '@nestjs/common';
import type { TransactionClient } from '@api/core/database';
import { REGISTRATION_ROLE_NAME } from '../../contracts/registration-role.policy';

@Injectable()
export class PrismaRegistrationRoleWriter {
  async readDefaultRoleId(transaction: TransactionClient): Promise<string> {
    const role = await transaction.role.findUniqueOrThrow({
      where: { name: REGISTRATION_ROLE_NAME },
      select: { id: true },
    });
    return role.id;
  }

  async assign(
    transaction: TransactionClient,
    subjectId: string,
    roleId: string,
  ) {
    await transaction.userRole.create({ data: { userId: subjectId, roleId } });
  }
}
