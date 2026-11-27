/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Moderation
 * 📄 File: apps/api/src/modules/moderation/presentation/ban-appeal-files.controller.ts
 *
 * 🎯 Purpose:
 * Screenshot upload for a banned person's appeal.
 *
 * ⚠️ Important:
 * There is no session. The guard verifies the ban ticket BEFORE the body is
 * parsed, so strangers cannot make the server buffer files.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import {
  BadRequestException,
  Controller,
  Headers,
  Injectable,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { ScreenshotUpload } from '../contracts/appeal-screenshots.port';
import { BanAppealsService } from '../infrastructure/prisma-ban-appeals';
import { moderationFailure } from './moderation-failure';

const TICKET_HEADER = 'x-ban-ticket';
const MAX_SCREENSHOT_BYTES = 10 * 1024 * 1024;

@Injectable()
export class BanTicketGuard implements CanActivate {
  constructor(private readonly appeals: BanAppealsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<{ headers: Record<string, unknown> }>();
    const ticket = request.headers[TICKET_HEADER];
    try {
      await this.appeals.requireTicket(
        typeof ticket === 'string' ? ticket : '',
      );
    } catch (error) {
      throw moderationFailure(error);
    }
    return true;
  }
}

@Controller('moderation/ban-appeal/files')
export class BanAppealFilesController {
  constructor(private readonly appeals: BanAppealsService) {}

  @Post()
  @UseGuards(BanTicketGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { files: 1, fileSize: MAX_SCREENSHOT_BYTES },
    }),
  )
  async upload(
    @Headers(TICKET_HEADER) ticket: string,
    @UploadedFile() file?: ScreenshotUpload,
  ) {
    if (!file)
      throw new BadRequestException(
        'A multipart file field named "file" is required.',
      );
    try {
      return await this.appeals.addFile(ticket, file);
    } catch (error) {
      throw moderationFailure(error);
    }
  }
}
