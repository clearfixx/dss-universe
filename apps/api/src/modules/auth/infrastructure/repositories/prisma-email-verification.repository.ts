import { Injectable } from '@nestjs/common';
import { AuditWriterService } from '@api/core/audit';
import { PrismaService } from '@api/core/database';

@Injectable()
export class PrismaEmailVerificationRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditWriterService,
  ) {}

  async consume(tokenHash: string): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const credential = await tx.emailVerification.findUnique({
        where: { tokenHash },
      });
      if (!credential) return false;
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${credential.userId} FOR UPDATE`;
      const consumed = await tx.emailVerification.deleteMany({
        where: {
          userId: credential.userId,
          tokenHash,
          expiresAt: { gt: new Date() },
        },
      });
      if (consumed.count !== 1) return false;
      const user = await tx.user.update({
        where: { id: credential.userId },
        data: { emailVerifiedAt: new Date() },
        select: { id: true },
      });
      await this.audit.append(tx, {
        action: 'auth.email.verified',
        actorType: 'USER',
        actorId: user.id,
        targetType: 'User',
        targetId: user.id,
      });
      return true;
    });
  }
}
