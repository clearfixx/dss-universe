/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/presentation/mappers/map-users-failure.ts
 *
 * 🎯 Purpose:
 * Preserves the Users not-found transport contract for its private domain error.
 *
 * ⚠️ Important:
 * Unknown failures retain identity; no lookup or profile policy belongs here.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { NotFoundException } from '@nestjs/common';
import { UserNotFoundException } from '../../domain/exceptions/user-not-found.exception';

export function mapUsersFailure(failure: unknown): unknown {
  return failure instanceof UserNotFoundException
    ? new NotFoundException(failure.message)
    : failure;
}
