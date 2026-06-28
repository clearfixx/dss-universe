import { UnauthorizedException } from '@nestjs/common';
import { AUTH_ERRORS } from '../constants/auth-errors.constant';

export class InvalidCredentialsException extends UnauthorizedException {
  constructor() {
    super(AUTH_ERRORS.INVALID_CREDENTIALS);
  }
}
