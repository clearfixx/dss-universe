import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { RolesGuard } from './guards/roles.guard';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [JwtModule.register({})],
  providers: [JwtStrategy, RolesGuard],
  exports: [JwtModule, RolesGuard],
})
export class AuthCoreModule {}
