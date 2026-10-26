/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Root Error Contract Characterization
 * 📄 File: apps/api/src/core/graphql/errors/domain-exception-constructor.characterization.spec.ts
 * 🎯 Purpose: Records inherited owner failure envelopes before decoupling Nest.
 * 🧠 Responsibilities: checks exact constructor status, message and response.
 * 🏗️ Architecture: Test-only cross-owner inventory; no production composition.
 * ⚠️ Important: Does not prove actual REST/Apollo handling or authorization.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { InvalidCredentialsException } from '../../../modules/auth/domain/exceptions/invalid-credentials.exception';
import { EmailAlreadyExistsException } from '../../../modules/auth/domain/exceptions/email-already-exists.exception';
import { TwoFactorRequiredException } from '../../../modules/auth/domain/exceptions/two-factor-required.exception';
import { LoginRateLimitedException } from '../../../modules/auth/domain/exceptions/login-rate-limited.exception';
import { UserNotFoundException } from '../../../modules/users/domain/exceptions/user-not-found.exception';
import { AvatarMediaForbiddenException } from '../../../modules/media/domain/exceptions/avatar-media-forbidden.exception';
import { CoverMediaForbiddenException } from '../../../modules/media/domain/exceptions/cover-media-forbidden.exception';
import { InvalidAvatarMediaException } from '../../../modules/media/domain/exceptions/invalid-avatar-media.exception';
import { InvalidCoverMediaException } from '../../../modules/media/domain/exceptions/invalid-cover-media.exception';
import { MediaAccessForbiddenException } from '../../../modules/media/domain/exceptions/media-access-forbidden.exception';

describe('DEBT-079 inherited constructor envelopes', () => {
  it.each([
    [
      InvalidCredentialsException,
      401,
      'Invalid email or password',
      'Unauthorized',
    ],
    [
      EmailAlreadyExistsException,
      409,
      'User with this email already exists',
      'Conflict',
    ],
    [
      TwoFactorRequiredException,
      401,
      'A valid two-factor or recovery code is required.',
      'Unauthorized',
    ],
    [UserNotFoundException, 404, 'User not found', 'Not Found'],
    [
      AvatarMediaForbiddenException,
      403,
      'You can only use your own media as an avatar.',
      'Forbidden',
    ],
    [
      CoverMediaForbiddenException,
      403,
      'You can only use your own media as a profile cover.',
      'Forbidden',
    ],
    [
      InvalidAvatarMediaException,
      400,
      'The selected media cannot be used as an avatar.',
      'Bad Request',
    ],
    [
      InvalidCoverMediaException,
      400,
      'The selected media cannot be used as a profile cover.',
      'Bad Request',
    ],
    [
      MediaAccessForbiddenException,
      403,
      'You do not have access to this media.',
      'Forbidden',
    ],
  ] as const)(
    '%p preserves its structured envelope',
    (Failure, statusCode, message, error) => {
      const failure = new Failure();
      expect(failure.getStatus()).toBe(statusCode);
      expect(failure.message).toBe(message);
      expect(failure.getResponse()).toEqual({ statusCode, message, error });
    },
  );

  it('keeps the rate-limit constructor response as a string, not an object', () => {
    const failure = new LoginRateLimitedException();
    const message = 'Login is temporarily unavailable. Please try again later.';
    expect(failure.getStatus()).toBe(429);
    expect(failure.message).toBe(message);
    expect(failure.getResponse()).toBe(message);
  });

  it.each([
    [
      InvalidAvatarMediaException,
      'The selected media is missing its processed avatar variant.',
    ],
    [
      InvalidCoverMediaException,
      'The selected media is missing its processed cover variant.',
    ],
  ] as const)(
    '%p preserves its eligibility-specific message',
    (Failure, message) => {
      const failure = new Failure(message);
      expect(failure.getResponse()).toEqual({
        statusCode: 400,
        message,
        error: 'Bad Request',
      });
    },
  );
});
