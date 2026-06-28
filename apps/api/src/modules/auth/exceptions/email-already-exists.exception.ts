import { ConflictException } from '@nestjs/common';
import { AUTH_ERRORS } from '../constants/auth-errors.constant';

export class EmailAlreadyExistsException extends ConflictException {
  constructor() {
    super(AUTH_ERRORS.EMAIL_ALREADY_EXISTS);
  }
}
