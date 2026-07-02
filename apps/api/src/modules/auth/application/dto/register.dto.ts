/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/application/dto/register.dto.ts
 *
 * 🎯 Purpose:
 * Defines the request contract for user registration.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  username!: string;

  @IsString()
  @IsNotEmpty()
  displayName!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
