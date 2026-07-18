/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media
 * 📄 File: apps/api/src/modules/media/application/services/media-upload-policy.service.spec.ts
 *
 * 🎯 Purpose:
 * Verifies Media v1 upload policy selection and declaration validation.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { MediaUploadPolicyException } from '../../domain/exceptions/media-upload-policy.exception';
import { MediaKind } from '../../domain/enums/media-kind.enum';
import { MediaUploadPolicyService } from './media-upload-policy.service';

describe('MediaUploadPolicyService', () => {
  const service = new MediaUploadPolicyService();

  it('normalizes and accepts a valid avatar declaration', () => {
    expect(
      service.validate({
        policyKey: 'avatar',
        originalFilename: 'Commander.JPEG',
        declaredMimeType: ' IMAGE/JPEG ',
        declaredSize: 1024,
      }),
    ).toMatchObject({
      extension: 'jpeg',
      normalizedMimeType: 'image/jpeg',
      policy: { key: 'avatar', kind: MediaKind.IMAGE },
    });
  });

  it.each([
    {
      name: 'zero-sized files',
      input: {
        policyKey: 'avatar' as const,
        originalFilename: 'avatar.png',
        declaredMimeType: 'image/png',
        declaredSize: 0,
      },
    },
    {
      name: 'oversized images',
      input: {
        policyKey: 'cover' as const,
        originalFilename: 'cover.webp',
        declaredMimeType: 'image/webp',
        declaredSize: 5 * 1024 * 1024 + 1,
      },
    },
    {
      name: 'disallowed MIME types',
      input: {
        policyKey: 'content-image' as const,
        originalFilename: 'payload.svg',
        declaredMimeType: 'image/svg+xml',
        declaredSize: 1024,
      },
    },
    {
      name: 'disallowed extensions',
      input: {
        policyKey: 'attachment' as const,
        originalFilename: 'archive.exe',
        declaredMimeType: 'application/zip',
        declaredSize: 1024,
      },
    },
  ])('rejects $name', ({ input }) => {
    expect(() => service.validate(input)).toThrow(MediaUploadPolicyException);
  });
});
