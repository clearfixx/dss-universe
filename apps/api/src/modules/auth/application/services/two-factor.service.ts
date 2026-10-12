/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/application/services/two-factor.service.ts
 *
 * 🎯 Purpose:
 * Coordinates second-factor setup, login proof and password-protected disabling.
 *
 * 🧠 Responsibilities:
 * • generates and verifies credential material;
 * • translates persistence outcomes into existing public errors;
 * • returns recovery plaintext only after confirmation commits.
 *
 * 🏗️ Architecture:
 * Auth application service using a private port; no ORM/profile dependency.
 *
 * ⚠️ Important:
 * Confirmation verification runs under lock through a pure callback.
 * Disable proof and mutation share the subject lock. Never log secrets.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { PasswordHashService } from './password-hash.service';
import { TotpService } from './totp.service';
import { TwoFactorRequiredException } from '../../domain/exceptions/two-factor-required.exception';
import {
  TWO_FACTOR_REPOSITORY,
  type TwoFactorRepository,
} from '../../domain/repositories/two-factor.repository.interface';

@Injectable()
export class TwoFactorService {
  constructor(
    @Inject(TWO_FACTOR_REPOSITORY)
    private readonly credentials: TwoFactorRepository,
    private readonly passwords: PasswordHashService,
    private readonly totp: TotpService,
  ) {}
  status(userId: string) {
    return this.credentials.status(userId);
  }
  async begin(userId: string, email: string) {
    const secret = this.totp.createSecret();
    if (!(await this.credentials.begin(userId, this.totp.encrypt(secret))))
      throw new BadRequestException(
        'Two-factor authentication is already enabled.',
      );
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
    const result = await this.credentials.confirm(
      userId,
      (encryptedSecret) =>
        this.totp.verify(this.totp.decrypt(encryptedSecret), code),
      recoveryCodes.map((value) => this.totp.recoveryHash(value)),
    );
    if (result === 'missing')
      throw new BadRequestException('No pending two-factor setup exists.');
    if (result === 'invalid')
      throw new BadRequestException('Invalid two-factor code.');
    return { recoveryCodes };
  }
  async assertLogin(userId: string, code?: string): Promise<void> {
    const encryptedSecret = await this.credentials.findEnabledSecret(userId);
    if (encryptedSecret === null) return;
    if (!code) throw new TwoFactorRequiredException();
    if (this.totp.verify(this.totp.decrypt(encryptedSecret), code)) return;
    if (
      !(await this.credentials.consumeRecovery(
        userId,
        this.totp.recoveryHash(code),
      ))
    )
      throw new TwoFactorRequiredException();
  }
  async disable(userId: string, password: string, code: string) {
    const result = await this.credentials.disable(
      userId,
      (passwordHash) => this.passwords.compare(password, passwordHash),
      (encryptedSecret) =>
        this.totp.verify(this.totp.decrypt(encryptedSecret), code),
      this.totp.recoveryHash(code),
    );
    if (result === 'invalid-password')
      throw new BadRequestException('Invalid credentials.');
    if (result === 'invalid-factor') throw new TwoFactorRequiredException();
    return { success: true };
  }
}
