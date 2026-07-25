/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media
 * 📄 File: apps/api/src/modules/media/application/services/media-url-signer.service.ts
 *
 * 🎯 Purpose:
 * Issues and verifies short-lived, storage-neutral media capabilities.
 *
 * ⚠️ Important:
 * Signed tokens never contain bucket names or storage keys.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';

import type { MediaAccessTokenPayload } from '../types/media-access-token.type';

const SIGNED_URL_TTL_SECONDS = 5 * 60;

@Injectable()
export class MediaUrlSignerService {
  constructor(private readonly config: ConfigService) {}

  issue(
    mediaId: string,
    variantName: string,
    subjectId: string,
    now = new Date(),
  ): { token: string; payload: MediaAccessTokenPayload } {
    const payload: MediaAccessTokenPayload = {
      mediaId,
      variantName,
      subjectId,
      expiresAt: Math.floor(now.getTime() / 1000) + SIGNED_URL_TTL_SECONDS,
    };
    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
    return {
      token: `${encoded}.${this.signature(encoded)}`,
      payload,
    };
  }

  verify(token: string, now = new Date()): MediaAccessTokenPayload {
    const [encoded, providedSignature, extra] = token.split('.');
    if (!encoded || !providedSignature || extra) {
      throw this.invalidToken();
    }
    const expected = Buffer.from(this.signature(encoded), 'base64url');
    const provided = Buffer.from(providedSignature, 'base64url');
    if (
      expected.length !== provided.length ||
      !timingSafeEqual(expected, provided)
    ) {
      throw this.invalidToken();
    }

    const payload = this.parsePayload(encoded);
    if (payload.expiresAt <= Math.floor(now.getTime() / 1000)) {
      throw this.invalidToken('Media access URL has expired.');
    }
    return payload;
  }

  private parsePayload(encoded: string): MediaAccessTokenPayload {
    try {
      const value: unknown = JSON.parse(
        Buffer.from(encoded, 'base64url').toString('utf8'),
      );
      if (
        typeof value !== 'object' ||
        value === null ||
        !('mediaId' in value) ||
        !('variantName' in value) ||
        !('subjectId' in value) ||
        !('expiresAt' in value) ||
        typeof value.mediaId !== 'string' ||
        typeof value.variantName !== 'string' ||
        typeof value.subjectId !== 'string' ||
        typeof value.expiresAt !== 'number'
      ) {
        throw new Error('Invalid payload.');
      }
      return value as MediaAccessTokenPayload;
    } catch {
      throw this.invalidToken();
    }
  }

  private signature(encoded: string): string {
    const secret = this.config.getOrThrow<string>('MEDIA_SIGNING_SECRET');
    return createHmac('sha256', secret).update(encoded).digest('base64url');
  }

  private invalidToken(
    message = 'Media access URL is invalid.',
  ): UnauthorizedException {
    return new UnauthorizedException(message);
  }
}
