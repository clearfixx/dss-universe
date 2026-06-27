import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  Authenticated,
  AuthUser,
  type AuthenticatedUser,
} from '@api/core/auth';
import { AuthService } from '../auth.service';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { JwtAuthGuard } from '@api/core/auth';
import {
  Permission,
  PermissionsGuard,
  RequirePermissions,
} from '@api/core/authorization';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto);
  }

  @Post('logout')
  @Authenticated()
  logout(@AuthUser() user: AuthenticatedUser) {
    return this.authService.logout(user.id);
  }

  @Get('me')
  @Authenticated()
  me(@AuthUser() user: AuthenticatedUser) {
    return user;
  }

  @Get('admin-test')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.SystemSettingsRead)
  adminTest() {
    return {
      status: 'ok',
      message: 'Admin permissions work',
    };
  }
}
