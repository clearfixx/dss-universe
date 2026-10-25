/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Identity Composition
 * 📄 File: apps/api/src/composition/identity/presentation/dto/register.dto.ts
 *
 * 🎯 Purpose:
 * Defines REST registration input with optional, nonblank displayName.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  username!: string;

  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  displayName?: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
