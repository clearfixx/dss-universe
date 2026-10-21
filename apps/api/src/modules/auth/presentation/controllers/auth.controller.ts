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
 * • delegates logout to AuthService;
 * • exposes the authenticated request context, never a Users profile.
 * Combined registration/login/refresh routes belong to identity composition.
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

import { Controller, Get, Post, UseGuards } from '@nestjs/common';

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

import { AuthService } from '../../application/services/auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('logout')
  @Authenticated()
  logout(@AuthUser() user: AuthenticatedUser) {
    return this.authService.logout(user.id, user.sessionId);
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
