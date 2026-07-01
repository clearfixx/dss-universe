/**
 * 📄 File: apps/api/src/core/database/exceptions/database.exception.ts
 *
 * DSS Universe — Core Database Exception
 *
 * Generic database exception for unexpected persistence-layer failures.
 * Prisma-specific known errors should be mapped before falling back here.
 */

import { InternalServerErrorException } from '@nestjs/common';

export class DatabaseException extends InternalServerErrorException {
  public constructor(message = 'Database error') {
    super({
      message,
      error: 'Database Error',
      statusCode: 500,
    });
  }
}
