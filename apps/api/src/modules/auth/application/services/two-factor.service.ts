import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '@api/core/database';
import { AuditWriterService } from '@api/core/audit';
import { PasswordHashService } from './password-hash.service';
import { TotpService } from './totp.service';
import { TwoFactorRequiredException } from '../../domain/exceptions/two-factor-required.exception';

@Injectable()
export class TwoFactorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditWriterService,
    private readonly passwords: PasswordHashService,
    private readonly totp: TotpService,
  ) {}

  async status(userId: string) {
    const record = await this.prisma.userTwoFactor.findUnique({
      where: { userId },
      select: { enabledAt: true, recoveryCodeHashes: true },
    });
    return {
      enabled: Boolean(record?.enabledAt),
      recoveryCodesRemaining: record?.recoveryCodeHashes.length ?? 0,
    };
  }

  async begin(userId: string, email: string) {
    const secret = this.totp.createSecret();
    const encryptedSecret = this.totp.encrypt(secret);
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "userId" FROM user_two_factor WHERE "userId" = ${userId} FOR UPDATE`;
      const current = await tx.userTwoFactor.findUnique({
        where: { userId },
        select: { enabledAt: true },
      });
      if (current?.enabledAt) {
        throw new BadRequestException(
          'Two-factor authentication is already enabled.',
        );
      }
      await tx.userTwoFactor.upsert({
        where: { userId },
        create: { userId, encryptedSecret },
        update: {
          encryptedSecret,
          recoveryCodeHashes: [],
          enabledAt: null,
        },
      });
    });
    const label = encodeURIComponent(`DSS Universe:${email}`);
    const issuer = encodeURIComponent('DSS Universe');
    return {
      secret,
      otpauthUri: `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`,
    };
  }

  async confirm(userId: string, code: string) {
    const recoveryCodes = Array.from({ length: 10 }, () =>
      this.totp.recoveryCode(),
    );
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "userId" FROM user_two_factor WHERE "userId" = ${userId} FOR UPDATE`;
      const record = await tx.userTwoFactor.findUnique({ where: { userId } });
      if (!record || record.enabledAt) {
        throw new BadRequestException('No pending two-factor setup exists.');
      }
      if (!this.totp.verify(this.totp.decrypt(record.encryptedSecret), code)) {
        throw new BadRequestException('Invalid two-factor code.');
      }
      await tx.userTwoFactor.update({
        where: { userId },
        data: {
          enabledAt: new Date(),
          recoveryCodeHashes: recoveryCodes.map((value) =>
            this.totp.recoveryHash(value),
          ),
        },
      });
      await this.audit.append(tx, {
        action: 'auth.two-factor.enabled',
        actorType: 'USER',
        actorId: userId,
        targetType: 'User',
        targetId: userId,
      });
    });
    return { recoveryCodes };
  }

  async assertLogin(userId: string, code?: string): Promise<void> {
    const record = await this.prisma.userTwoFactor.findUnique({
      where: { userId },
    });
    if (!record?.enabledAt) return;
    if (!code) throw new TwoFactorRequiredException();
    if (this.totp.verify(this.totp.decrypt(record.encryptedSecret), code))
      return;

    const recoveryHash = this.totp.recoveryHash(code);
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "userId" FROM user_two_factor WHERE "userId" = ${userId} FOR UPDATE`;
      const current = await tx.userTwoFactor.findUnique({ where: { userId } });
      const index = current?.recoveryCodeHashes.indexOf(recoveryHash) ?? -1;
      if (index < 0) throw new TwoFactorRequiredException();
      await tx.userTwoFactor.update({
        where: { userId },
        data: {
          recoveryCodeHashes: current!.recoveryCodeHashes.filter(
            (_, position) => position !== index,
          ),
        },
      });
      await this.audit.append(tx, {
        action: 'auth.two-factor.recovery-code-used',
        actorType: 'USER',
        actorId: userId,
        targetType: 'User',
        targetId: userId,
      });
    });
  }

  async disable(userId: string, password: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !(await this.passwords.compare(password, user.passwordHash))) {
      throw new BadRequestException('Invalid credentials.');
    }
    await this.assertLogin(userId, code);
    await this.prisma.$transaction(async (tx) => {
      await tx.userTwoFactor.delete({ where: { userId } });
      await tx.session.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await tx.user.update({
        where: { id: userId },
        data: { authVersion: { increment: 1 } },
      });
      await this.audit.append(tx, {
        action: 'auth.two-factor.disabled',
        actorType: 'USER',
        actorId: userId,
        targetType: 'User',
        targetId: userId,
      });
    });
    return { success: true };
  }
}
