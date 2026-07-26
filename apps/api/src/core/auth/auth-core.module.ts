import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { RolesGuard } from './guards/roles.guard';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PrismaModule } from '@api/core/database';

@Module({
  imports: [JwtModule.register({}), PrismaModule],
  providers: [JwtStrategy, RolesGuard],
  exports: [JwtModule, RolesGuard],
})
export class AuthCoreModule {}
