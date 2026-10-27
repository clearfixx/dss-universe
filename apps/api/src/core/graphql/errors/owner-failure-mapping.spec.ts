/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Root Error Contract Verification
 * 📄 File: apps/api/src/core/graphql/errors/owner-failure-mapping.spec.ts
 *
 * 🎯 Purpose:
 * Verifies exact owner presentation envelopes and unknown-failure identity.
 *
 * 🧠 Responsibilities:
 * • covers all ten known domain identities and eligibility-specific messages;
 * • rejects message/name spoofing and preserves existing Nest errors.
 *
 * 🏗️ Architecture:
 * Test-only cross-owner contract inventory; no production private imports.
 *
 * ⚠️ Important:
 * Pure mapping tests do not replace real transport or production-redaction proof.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { BadRequestException, HttpException } from '@nestjs/common';
import { mapAuthFailure } from '../../../modules/auth/presentation';
import { mapMediaFailure } from '../../../modules/media/presentation';
import { mapUsersFailure } from '../../../modules/users/presentation/mappers/map-users-failure';
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

describe('owner-local presentation failure mapping', () => {
  it.each([
    [mapAuthFailure, new InvalidCredentialsException(), 401, 'Unauthorized'],
    [mapAuthFailure, new EmailAlreadyExistsException(), 409, 'Conflict'],
    [mapAuthFailure, new TwoFactorRequiredException(), 401, 'Unauthorized'],
    [mapUsersFailure, new UserNotFoundException(), 404, 'Not Found'],
    [mapMediaFailure, new AvatarMediaForbiddenException(), 403, 'Forbidden'],
    [mapMediaFailure, new CoverMediaForbiddenException(), 403, 'Forbidden'],
    [mapMediaFailure, new MediaAccessForbiddenException(), 403, 'Forbidden'],
    [mapMediaFailure, new InvalidAvatarMediaException(), 400, 'Bad Request'],
    [mapMediaFailure, new InvalidCoverMediaException(), 400, 'Bad Request'],
    [
      mapMediaFailure,
      new InvalidAvatarMediaException(
        'The selected media is missing its processed avatar variant.',
      ),
      400,
      'Bad Request',
    ],
    [
      mapMediaFailure,
      new InvalidCoverMediaException(
        'The selected media is missing its processed cover variant.',
      ),
      400,
      'Bad Request',
    ],
  ] as const)(
    'maps %p / %p to the exact stable envelope',
    (map, failure, statusCode, error) => {
      const mapped = map(failure);
      expect(mapped).toBeInstanceOf(HttpException);
      if (!(mapped instanceof HttpException))
        throw new Error('Expected client envelope.');
      expect(mapped.getStatus()).toBe(statusCode);
      expect(mapped.getResponse()).toEqual({
        statusCode,
        message: failure.message,
        error,
      });
    },
  );

  it('keeps the accepted rate-limit envelope without adding an error field', () => {
    const failure = new LoginRateLimitedException();
    const mapped = mapAuthFailure(failure);
    if (!(mapped instanceof HttpException))
      throw new Error('Expected rate-limit envelope.');
    expect(mapped.getStatus()).toBe(429);
    expect(mapped.getResponse()).toEqual({
      message: failure.message,
      statusCode: 429,
    });
  });

  describe.each([mapAuthFailure, mapMediaFailure, mapUsersFailure])(
    '%p unknown failures',
    (map) => {
      it.each([
        undefined,
        null,
        'synthetic failure',
        new Error('synthetic infrastructure failure'),
        new BadRequestException('existing transport response'),
        {
          name: 'LoginRateLimitedException',
          message: 'Login is temporarily unavailable. Please try again later.',
          statusCode: 429,
        },
        { name: 'UserNotFoundException', message: 'User not found' },
        {
          name: 'InvalidAvatarMediaException',
          message: 'The selected media cannot be used as an avatar.',
        },
      ])('returns %p unchanged', (failure) => {
        expect(map(failure)).toBe(failure);
      });
    },
  );
});
