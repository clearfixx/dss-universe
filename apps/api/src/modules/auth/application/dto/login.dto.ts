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

import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
