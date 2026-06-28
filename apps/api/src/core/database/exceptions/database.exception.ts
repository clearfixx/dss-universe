import { InternalServerErrorException } from '@nestjs/common';

export class DatabaseException extends InternalServerErrorException {
  constructor(message = 'Database error') {
    super({
      message,
      error: 'Database Error',
      statusCode: 500,
    });
  }
}
