/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media Tests
 * 📄 File: apps/api/src/modules/media/application/services/media-url-signer.service.spec.ts
 *
 * 🎯 Purpose:
 * Verifies signed media capability integrity and expiry.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { ConfigService } from '@nestjs/config';

import { MediaUrlSignerService } from './media-url-signer.service';

describe('MediaUrlSignerService', () => {
  const config = new ConfigService({
    MEDIA_SIGNING_SECRET: 'test-signing-secret-with-at-least-32-characters',
  });
  const signer = new MediaUrlSignerService(config);
  const now = new Date('2026-07-25T00:00:00.000Z');

  it('round-trips a storage-neutral signed capability', () => {
    const issued = signer.issue('media-1', 'document', 'user-1', now);

    expect(signer.verify(issued.token, now)).toEqual(issued.payload);
    expect(issued.token).not.toContain('storage');
  });

  it('rejects tampering and expired tokens', () => {
    const issued = signer.issue('media-1', 'document', 'user-1', now);

    expect(() => signer.verify(`${issued.token}x`, now)).toThrow();
    expect(() =>
      signer.verify(issued.token, new Date('2026-07-25T00:06:00.000Z')),
    ).toThrow('expired');
  });
});
