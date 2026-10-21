/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media
 * 📄 File: apps/api/src/modules/media/application/services/media-mime-inspection.service.spec.ts
 *
 * 🎯 Purpose:
 * Verifies content-based MIME inspection and safe text fallback.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { UnsupportedMediaTypeException } from '@nestjs/common';

import { MediaMimeInspectionService } from './media-mime-inspection.service';

const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

describe('MediaMimeInspectionService', () => {
  const service = new MediaMimeInspectionService();

  it('detects an image from magic bytes', () => {
    expect(service.inspect(PNG_1X1, 'image/png')).toBe('image/png');
  });

  it('accepts valid UTF-8 text without a binary signature', () => {
    expect(
      service.inspect(Buffer.from('# DSS Universe\n'), 'text/markdown'),
    ).toBe('text/markdown');
  });

  it('rejects unidentified binary content', () => {
    expect(() =>
      service.inspect(Buffer.from([0, 1, 2, 3]), 'text/plain'),
    ).toThrow(UnsupportedMediaTypeException);
  });
});
