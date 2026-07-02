/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/presentation/controllers/auth.controller.ts
 *
 * 🎯 Purpose:
 * Exposes HTTP endpoints for authentication operations.
 *
 * 🧠 Responsibilities:
 * • receives authentication requests;
 * • delegates login, registration, refresh, and logout to AuthService;
 * • exposes current authenticated user data.
 *
 * 🏗️ Architecture:
 * Thin controller.
 * No authentication business logic belongs here.
 *
 * ⚠️ Important:
 * Do not move password, token, or refresh-session logic into this controller.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';

import {
  Authenticated,
  AuthUser,
  JwtAuthGuard,
  type AuthenticatedUser,
} from '@api/core/auth';
import {
  Permission,
  PermissionsGuard,
  RequirePermissions,
} from '@api/core/authorization';

import type { LoginDto } from '../../application/dto/login.dto';
import type { RefreshTokenDto } from '../../application/dto/refresh-token.dto';
import type { RegisterDto } from '../../application/dto/register.dto';
import { AuthService } from '../../application/services/auth.service';

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
