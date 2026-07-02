/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/application/services/password-hash.service.ts
 *
 * 🎯 Purpose:
 * Provides password and refresh-token hashing utilities for authentication flows.
 *
 * 🧠 Responsibilities:
 * • hashes sensitive authentication secrets;
 * • compares raw credentials against stored hashes;
 * • keeps bcrypt usage isolated from AuthService.
 *
 * 🏗️ Architecture:
 * Application service.
 * AuthService depends on this abstraction instead of using bcrypt directly.
 *
 * ⚠️ Important:
 * Never store raw passwords or raw refresh tokens.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

@Injectable()
export class PasswordHashService {
  private readonly saltRounds = 12;

  hash(value: string): Promise<string> {
    return bcrypt.hash(value, this.saltRounds);
  }

  compare(value: string, hash: string): Promise<boolean> {
    return bcrypt.compare(value, hash);
  }
}
