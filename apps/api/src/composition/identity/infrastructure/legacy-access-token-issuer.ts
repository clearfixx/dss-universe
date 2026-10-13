/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Identity Composition
 * 📄 File: apps/api/src/composition/identity/infrastructure/legacy-access-token-issuer.ts
 *
 * 🎯 Purpose:
 * Preserves existing JWT display/access claims without profile knowledge in Auth.
 *
 * 🧠 Responsibilities:
 * • combines authoritative Auth facts with a Users-owned display projection;
 * • obtains effective access claims from Authorization;
 * • signs the existing access-token format with the existing lifetime.
 *
 * 🏗️ Architecture:
 * Composition adapter implementing the consumer-owned Auth issuance contract.
 *
 * ⚠️ Important:
 * Missing profile, access authority, configuration or signing must fail closed.
 * Display fields never override subject, email, session or access version.
 * No persistence client or credential hash belongs here.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { JwtPayload } from '@api/core/auth';
import { PermissionsService } from '@api/core/authorization';
import type { AccessTokenIssuer, TokenSubject } from '@api/modules/auth';
import {
  PROFILE_DISPLAY_READER,
  type ProfileDisplayReader,
} from '@api/modules/users';

@Injectable()
export class LegacyAccessTokenIssuer implements AccessTokenIssuer {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly permissions: PermissionsService,
    @Inject(PROFILE_DISPLAY_READER)
    private readonly profiles: ProfileDisplayReader,
  ) {}

  async issue(subject: TokenSubject, sessionId: string): Promise<string> {
    const secret = this.config.get<string>('JWT_ACCESS_SECRET');
    if (!secret) throw new Error('JWT_ACCESS_SECRET is not configured.');
    const [username, access] = await Promise.all([
      this.profiles.findUsername(subject.id),
      this.permissions.getAccessProfileByUserId(subject.id),
    ]);
    if (username === null)
      throw new Error('Token display identity is unavailable.');
    const payload: JwtPayload = {
      sub: subject.id,
      email: subject.email,
      ver: subject.authVersion,
      sid: sessionId,
      username,
      roles: access.roles,
      permissions: access.permissions,
    };
    return this.jwt.signAsync(payload, { secret, expiresIn: '15m' });
  }
}
