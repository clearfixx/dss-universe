/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media
 * 📄 File: apps/api/src/modules/media/presentation/http/media-delivery.controller.ts
 *
 * 🎯 Purpose:
 * Delivers public media bytes and deterministic fallback avatars.
 *
 * ⚠️ Important:
 * GraphQL owns metadata and mutations; HTTP owns binary delivery.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import {
  Controller,
  Get,
  Header,
  Param,
  Res,
  StreamableFile,
} from '@nestjs/common';
import type { Response } from 'express';

import { MediaDeliveryService } from '../../application/services/media-delivery.service';

@Controller('media')
export class MediaDeliveryController {
  constructor(private readonly delivery: MediaDeliveryService) {}

  @Get('public/:mediaId/:variantName')
  async publicVariant(
    @Param('mediaId') mediaId: string,
    @Param('variantName') variantName: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const media = await this.delivery.publicVariant(mediaId, variantName);
    response.type(media.mimeType);
    response.setHeader('ETag', `"${media.checksum}"`);
    response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return new StreamableFile(media.content);
  }

  @Get('avatars/fallback/:seed.svg')
  @Header('Content-Type', 'image/svg+xml')
  @Header('Cache-Control', 'public, max-age=86400')
  fallback(@Param('seed') seed: string): string {
    const initials = seed
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .slice(0, 2)
      .toUpperCase();
    return `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><rect width="256" height="256" rx="128" fill="#20134a"/><text x="128" y="145" text-anchor="middle" font-family="system-ui,sans-serif" font-size="72" font-weight="700" fill="#a78bfa">${initials || 'DSS'}</text></svg>`;
  }
}
