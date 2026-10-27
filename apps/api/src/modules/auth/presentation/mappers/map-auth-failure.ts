/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/presentation/mappers/map-auth-failure.ts
 *
 * 🎯 Purpose:
 * Converts private Auth failures into the established client error envelopes.
 *
 * 🧠 Responsibilities:
 * • recognizes only Auth-owned error identities;
 * • preserves unknown failures unchanged.
 *
 * 🏗️ Architecture:
 * Pure owner presentation capability for local and root transport boundaries.
 *
 * ⚠️ Important:
 * No credential reads, accounting, profile knowledge or message-based matching.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import {
  ConflictException,
  HttpException,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { EmailAlreadyExistsException } from '../../domain/exceptions/email-already-exists.exception';
import { InvalidCredentialsException } from '../../domain/exceptions/invalid-credentials.exception';
import { LoginRateLimitedException } from '../../domain/exceptions/login-rate-limited.exception';
import { TwoFactorRequiredException } from '../../domain/exceptions/two-factor-required.exception';

export function mapAuthFailure(failure: unknown): unknown {
  if (failure instanceof EmailAlreadyExistsException)
    return new ConflictException(failure.message);
  if (
    failure instanceof InvalidCredentialsException ||
    failure instanceof TwoFactorRequiredException
  )
    return new UnauthorizedException(failure.message);
  if (failure instanceof LoginRateLimitedException)
    return new HttpException(
      { message: failure.message, statusCode: HttpStatus.TOO_MANY_REQUESTS },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  return failure;
}

// The airlock translates the alarm; it does not ask for the pilot's password. ☕
