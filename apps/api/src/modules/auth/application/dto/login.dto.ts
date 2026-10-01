/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/application/dto/login.dto.ts
 *
 * 🎯 Purpose:
 * Defines the request contract for user login.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsString()
  @Matches(/^(?:\d{6}|[a-f0-9]{6}-[a-f0-9]{6})$/i)
  twoFactorCode?: string;
}
