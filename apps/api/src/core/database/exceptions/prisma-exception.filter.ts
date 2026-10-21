/**
 * 📄 File: apps/api/src/core/database/exceptions/prisma-exception.filter.ts
 *
 * DSS Universe — Prisma Exception Filter
 *
 * Catches Prisma errors at the HTTP boundary and returns normalized responses.
 */

import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

import { mapPrismaError } from './prisma-error.mapper';

@Catch(
  Prisma.PrismaClientKnownRequestError,
  Prisma.PrismaClientUnknownRequestError,
  Prisma.PrismaClientValidationError,
)
export class PrismaExceptionFilter implements ExceptionFilter {
  public catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();

    const httpException = mapPrismaError(exception);
    const status = httpException.getStatus();
    const body = httpException.getResponse();

    response.status(status).json(body);
  }
}
