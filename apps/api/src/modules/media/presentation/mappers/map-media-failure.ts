/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media
 * 📄 File: apps/api/src/modules/media/presentation/mappers/map-media-failure.ts
 *
 * 🎯 Purpose:
 * Preserves Media client failures without leaking transport into its domain.
 *
 * 🧠 Responsibilities:
 * • maps known ownership, visibility and eligibility failures;
 * • preserves eligibility text and unknown error identity.
 *
 * 🏗️ Architecture:
 * Owner-local presentation capability consumed by Media and root transports.
 *
 * ⚠️ Important:
 * No asset reads, permissions or file IO; never match by name or message.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { AvatarMediaForbiddenException } from '../../domain/exceptions/avatar-media-forbidden.exception';
import { CoverMediaForbiddenException } from '../../domain/exceptions/cover-media-forbidden.exception';
import { InvalidAvatarMediaException } from '../../domain/exceptions/invalid-avatar-media.exception';
import { InvalidCoverMediaException } from '../../domain/exceptions/invalid-cover-media.exception';
import { MediaAccessForbiddenException } from '../../domain/exceptions/media-access-forbidden.exception';

export function mapMediaFailure(failure: unknown): unknown {
  if (
    failure instanceof AvatarMediaForbiddenException ||
    failure instanceof CoverMediaForbiddenException ||
    failure instanceof MediaAccessForbiddenException
  )
    return new ForbiddenException(failure.message);
  if (
    failure instanceof InvalidAvatarMediaException ||
    failure instanceof InvalidCoverMediaException
  )
    return new BadRequestException(failure.message);
  return failure;
}
