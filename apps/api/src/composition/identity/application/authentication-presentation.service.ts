/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Identity Composition
 * 📄 File: apps/api/src/composition/identity/application/authentication-presentation.service.ts
 *
 * 🎯 Purpose:
 * Coordinates registration and existing profile-bearing authentication responses.
 *
 * 🧠 Responsibilities:
 * • binds profile creation to atomic credential enrollment;
 * • invokes Auth flows through opaque contracts;
 * • assembles allowlisted Users presentation with explicit token responses.
 *
 * 🏗️ Architecture:
 * Named multi-owner composition use case, outside participating feature services.
 *
 * ⚠️ Important:
 * No hashing, session validation, permission decisions or ORM access belongs here.
 * Missing presentation cannot return a successful combined response.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import {
  AUTHENTICATION_FLOWS,
  AUTH_ERRORS,
  type AuthenticationFlows,
  type AuthenticationResult,
  type AuthClient,
  type LoginCredentials,
} from '@api/modules/auth';
import {
  VIEWER_PROFILE_READER,
  type ViewerProfileReader,
} from '@api/modules/users';
import {
  REGISTRATION_TRANSACTION,
  type RegistrationTransaction,
} from './contracts/registration-transaction.contract';

@Injectable()
export class AuthenticationPresentationService {
  constructor(
    @Inject(AUTHENTICATION_FLOWS) private readonly auth: AuthenticationFlows,
    @Inject(VIEWER_PROFILE_READER)
    private readonly profiles: ViewerProfileReader,
    @Inject(REGISTRATION_TRANSACTION)
    private readonly registration: RegistrationTransaction,
  ) {}
  async register(
    input: Readonly<{
      email: string;
      password: string;
      username: string;
      displayName?: string;
    }>,
    client: AuthClient = {},
  ) {
    const subjectId = await this.auth.enroll(
      input.email,
      input.password,
      this.registration.forProfile({
        username: input.username,
        displayName: input.displayName,
      }),
    );
    return this.compose(
      await this.auth.completeRegistration(subjectId, client),
    );
  }
  async login(input: LoginCredentials, client: AuthClient = {}) {
    return this.compose(await this.auth.login(input, client));
  }
  async refresh(input: Readonly<{ refreshToken: string }>) {
    try {
      return await this.compose(await this.auth.refresh(input));
    } catch {
      // Preserve the existing refresh endpoint's uniform denial contract.
      throw new UnauthorizedException(AUTH_ERRORS.INVALID_CREDENTIALS);
    }
  }
  async reactivateAccount(input: LoginCredentials, client: AuthClient = {}) {
    return this.compose(await this.auth.reactivateAccount(input, client));
  }
  private async compose(result: AuthenticationResult) {
    const user = await this.profiles.findById(result.subjectId);
    if (!user || user.id !== result.subjectId)
      throw new UnauthorizedException(AUTH_ERRORS.INVALID_CREDENTIALS);
    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        bio: user.bio,
        location: user.location,
        website: user.website,
        technologies: [...user.technologies],
        interests: [...user.interests],
        avatarUrl: user.avatarUrl,
        coverUrl: user.coverUrl,
        status: user.status,
        emailVerifiedAt: user.emailVerifiedAt,
        lastSeenAt: user.lastSeenAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      tokens: {
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
      },
    };
  }
}
