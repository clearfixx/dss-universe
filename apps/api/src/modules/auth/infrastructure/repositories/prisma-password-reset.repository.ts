import { Injectable } from '@nestjs/common';
import { PrismaService } from '@api/core/database';
import { AuditWriterService } from '@api/core/audit';

@Injectable()
export class PrismaPasswordResetRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditWriterService,
  ) {}

  async consume(tokenHash: string, passwordHash: string): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const candidate = await tx.passwordReset.findUnique({
        where: { tokenHash },
      });
      if (!candidate) return false;
      // All issuance and consumption lock the user first. Two different reset
      // tokens cannot race each other or resurrect a previous credential.
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${candidate.userId} FOR UPDATE`;
      const user = await tx.user.findUnique({
        where: { id: candidate.userId },
      });
      if (
        !user ||
        user.status !== 'ACTIVE' ||
        user.authVersion !== candidate.authVersion
      )
        return false;
      const consumed = await tx.passwordReset.deleteMany({
        where: {
          userId: user.id,
          tokenHash,
          expiresAt: { gt: new Date() },
          authVersion: user.authVersion,
        },
      });
      if (consumed.count !== 1) return false;
      await tx.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          authVersion: { increment: 1 },
          loginFailedAttempts: 0,
          loginLockedUntil: null,
        },
      });
      await tx.session.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await this.audit.append(tx, {
        action: 'auth.password.recovered',
        actorType: 'USER',
        actorId: user.id,
        targetType: 'User',
        targetId: user.id,
      });
      return true;
    });
  }
}
