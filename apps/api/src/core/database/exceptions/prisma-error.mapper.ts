/**
 * 📄 File: apps/api/src/core/database/exceptions/prisma-error.mapper.ts
 *
 * DSS Universe — Prisma Error Mapper
 *
 * Converts Prisma persistence errors into stable HTTP exceptions.
 */

import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
  type HttpException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { DatabaseException } from './database.exception';

export function isPrismaKnownRequestError(
  error: unknown,
): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError;
}

export function mapPrismaError(error: unknown): HttpException {
  if (!isPrismaKnownRequestError(error)) {
    return new DatabaseException();
  }

  switch (error.code) {
    case 'P2002':
      return new ConflictException({
        message: 'Unique constraint violation',
        error: 'Conflict',
        statusCode: 409,
      });

    case 'P2003':
      return new BadRequestException({
        message: 'Foreign key constraint violation',
        error: 'Bad Request',
        statusCode: 400,
      });

    case 'P2025':
      return new NotFoundException({
        message: 'Record not found',
        error: 'Not Found',
        statusCode: 404,
      });

    default:
      return new InternalServerErrorException({
        message: 'Database request failed',
        error: 'Database Error',
        statusCode: 500,
      });
  }
}
