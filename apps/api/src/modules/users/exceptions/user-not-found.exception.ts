import { NotFoundException } from '@nestjs/common';
import { USER_ERRORS } from '../constants/user-errors.constant';

export class UserNotFoundException extends NotFoundException {
  constructor() {
    super(USER_ERRORS.NOT_FOUND);
  }
}


