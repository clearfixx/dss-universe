/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/application/dto/refresh-token.dto.ts
 *
 * 🎯 Purpose:
 * Defines the request contract for refreshing authentication tokens.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { IsString } from 'class-validator';

export class RefreshTokenDto {
  @IsString()
  refreshToken!: string;
}
