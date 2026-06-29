/**
 * DSS File Passport 🛰️
 * File: apps/api/src/core/auth/strategies/jwt.strategy.ts
 * Purpose: JWT strategy for validating access tokens.
 * Phase: 2.4.5 — RBAC Core Migration
 * Architecture: Auth strategy
 */

import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import type { AuthenticatedUser } from '../types/authenticated-user.type';
import type { JwtPayload } from '../types/jwt-payload.type';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret',
    });
  }

  validate(payload: JwtPayload): AuthenticatedUser {
    return {
      id: payload.sub,
      email: payload.email,
      username: payload.username,
      roles: payload.roles ?? [],
      permissions: payload.permissions ?? [],
    };
  }
}
