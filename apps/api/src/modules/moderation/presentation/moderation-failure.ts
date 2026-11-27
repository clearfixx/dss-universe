/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Moderation
 * 📄 File: apps/api/src/modules/moderation/presentation/moderation-failure.ts
 *
 * 🎯 Purpose:
 * Maps Moderation errors to the client error envelopes.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ModerationSanctionError } from '../domain/errors/moderation-sanction.error';

export function moderationFailure(error: unknown): unknown {
  if (!(error instanceof ModerationSanctionError)) return error;
  switch (error.code) {
    case 'ACCESS_DENIED':
      return new ForbiddenException(error.message);
    case 'NOT_FOUND':
      return new NotFoundException(error.message);
    case 'INVALID_INPUT':
      return new BadRequestException(error.message);
    case 'INVALID_STATE':
      return new ConflictException(error.message);
  }
}
