/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Static Pages
 * 📄 File: apps/api/src/modules/static-pages/presentation/static-page-files.controller.ts
 *
 * 🎯 Purpose:
 * Public delivery of the files of a published static page.
 *
 * ⚠️ Important:
 * Only files of the published snapshot are served, so unpublishing or
 * publishing without a file closes it. The short cache keeps that true.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Res,
  StreamableFile,
} from '@nestjs/common';
import type { Response } from 'express';
import { StaticPagesService } from '../infrastructure/prisma-static-pages';

/** Shown inline; every other type downloads. */
const INLINE_TYPES = new Set(['image/webp', 'image/png', 'image/jpeg']);

@Controller('pages')
export class StaticPageFilesController {
  constructor(private readonly pages: StaticPagesService) {}

  @Get(':slug/files/:mediaId')
  async file(
    @Param('slug') slug: string,
    @Param('mediaId') mediaId: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const file = await this.pages.publishedFile(slug, mediaId);
    if (!file) throw new NotFoundException('File not found.');
    response.type(file.mimeType);
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    response.setHeader('Cache-Control', 'public, max-age=300');
    response.setHeader('ETag', `"${file.checksum}"`);
    if (!INLINE_TYPES.has(file.mimeType))
      response.setHeader(
        'Content-Disposition',
        `attachment; filename*=UTF-8''${encodeURIComponent(file.filename)}`,
      );
    return new StreamableFile(file.content);
  }
}
