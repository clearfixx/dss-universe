/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media
 * 📄 File: apps/api/src/modules/media/application/services/media-mime-inspection.service.ts
 *
 * 🎯 Purpose:
 * Detects an uploaded file's MIME type from its binary content.
 *
 * 🧠 Responsibilities:
 * • detects binary formats by magic bytes;
 * • safely recognizes UTF-8 text when no binary signature exists;
 * • rejects opaque content that cannot be identified.
 *
 * ⚠️ Important:
 * Browser-provided MIME headers are declarations, not inspection results.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Injectable, UnsupportedMediaTypeException } from '@nestjs/common';

const TEXT_MIME_TYPES = new Set(['text/plain', 'text/markdown']);
const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);
const PDF_SIGNATURE = Buffer.from('%PDF-');
const ZIP_SIGNATURES = [
  Buffer.from([0x50, 0x4b, 0x03, 0x04]),
  Buffer.from([0x50, 0x4b, 0x05, 0x06]),
  Buffer.from([0x50, 0x4b, 0x07, 0x08]),
];

@Injectable()
export class MediaMimeInspectionService {
  inspect(buffer: Buffer, declaredMimeType: string): string {
    const detected = this.detectBinaryMimeType(buffer);

    if (detected) {
      return detected;
    }

    if (TEXT_MIME_TYPES.has(declaredMimeType) && this.isUtf8Text(buffer)) {
      return declaredMimeType;
    }

    throw new UnsupportedMediaTypeException(
      'The uploaded file type could not be identified from its content.',
    );
  }

  private detectBinaryMimeType(buffer: Buffer): string | null {
    if (buffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
      return 'image/png';
    }
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return 'image/jpeg';
    }
    if (
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP'
    ) {
      return 'image/webp';
    }
    if (buffer.subarray(0, PDF_SIGNATURE.length).equals(PDF_SIGNATURE)) {
      return 'application/pdf';
    }
    if (
      ZIP_SIGNATURES.some((signature) =>
        buffer.subarray(0, signature.length).equals(signature),
      )
    ) {
      return 'application/zip';
    }
    return null;
  }

  private isUtf8Text(buffer: Buffer): boolean {
    if (buffer.includes(0)) {
      return false;
    }

    try {
      new TextDecoder('utf-8', { fatal: true }).decode(buffer);
      return true;
    } catch {
      return false;
    }
  }
}
