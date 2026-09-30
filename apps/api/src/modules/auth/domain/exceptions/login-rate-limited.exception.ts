import { HttpException, HttpStatus } from '@nestjs/common';

export class LoginRateLimitedException extends HttpException {
  constructor() {
    super(
      'Login is temporarily unavailable. Please try again later.',
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
