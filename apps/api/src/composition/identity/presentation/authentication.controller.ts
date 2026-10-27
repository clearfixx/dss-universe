/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Identity Composition
 * 📄 File: apps/api/src/composition/identity/presentation/authentication.controller.ts
 *
 * 🎯 Purpose:
 * Preserves REST authentication responses assembled across Auth and Users.
 *
 * 🧠 Responsibilities:
 * • receives the existing register/login/refresh requests;
 * • delegates combined responses to the named presentation use case.
 * • translates private Auth failures through its published presentation mapper.
 *
 * 🏗️ Architecture:
 * Thin composition controller; no credential, token or persistence logic.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Body, Controller, Post, Req } from '@nestjs/common';
import type { AuthenticatedRequest } from '@api/core/auth';
import {
  LoginDto,
  RefreshTokenDto,
  mapAuthFailure,
} from '@api/modules/auth/presentation';
import { RegisterDto } from './dto/register.dto';
import { AuthenticationPresentationService } from '../application/authentication-presentation.service';

@Controller('auth')
export class AuthenticationController {
  constructor(
    private readonly presentation: AuthenticationPresentationService,
  ) {}
  @Post('register')
  async register(
    @Body() input: RegisterDto,
    @Req() request: AuthenticatedRequest,
  ) {
    try {
      return await this.presentation.register(input, this.client(request));
    } catch (failure) {
      throw mapAuthFailure(failure);
    }
  }
  @Post('login')
  async login(@Body() input: LoginDto, @Req() request: AuthenticatedRequest) {
    try {
      return await this.presentation.login(input, this.client(request));
    } catch (failure) {
      throw mapAuthFailure(failure);
    }
  }
  @Post('refresh')
  refresh(@Body() input: RefreshTokenDto) {
    return this.presentation.refresh(input);
  }
  private client(request: AuthenticatedRequest) {
    return { userAgent: request.get('user-agent'), ipAddress: request.ip };
  }
}
