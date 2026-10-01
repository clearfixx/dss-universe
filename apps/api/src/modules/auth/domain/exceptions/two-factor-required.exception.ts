import { UnauthorizedException } from '@nestjs/common';

export class TwoFactorRequiredException extends UnauthorizedException {
  constructor() {
    super('A valid two-factor or recovery code is required.');
  }
}
