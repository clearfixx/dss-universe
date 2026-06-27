/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: auth.module.ts
 *
 * 🧠 Призначення:
 * Збирає всі компоненти модуля авторизації:
 * контролери, сервіси та залежності.
 *
 * 🛰️ Mission Control:
 * Якщо Nest каже:
 *
 *   "Nest can't resolve dependencies..."
 *
 * ...не панікуй. У 90% випадків ти просто забув
 * імпортувати потрібний Module. 😄
 *
 * 💡 Архітектурна примітка:
 * Authentication ≠ Authorization.
 *
 * AuthCoreModule
 *     │
 *     ├── JWT
 *     ├── Login
 *     ├── Refresh Token
 *     └── Identity
 *
 * AuthorizationModule
 *     │
 *     ├── Permissions
 *     ├── Guards
 *     ├── Policies
 *     └── Access Control
 *
 * ☕ Майбутньому Андрію:
 * Якщо дуже хочеться покласти PermissionsService
 * в AuthCoreModule...
 *
 * ...не треба. 😅
 *
 * Тримай модулі незалежними.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Module } from '@nestjs/common';

import { AuthCoreModule } from '@api/core/auth';
import { AuthorizationModule } from '@api/core/authorization';

import { UsersModule } from '../users/users.module';

import { AuthController } from './controllers/auth.controller';
import { AuthService } from './auth.service';
import { PasswordHashService } from './services/password-hash.service';
import { TokenService } from './services/token.service';

@Module({
  imports: [UsersModule, AuthCoreModule, AuthorizationModule],
  controllers: [AuthController],
  providers: [AuthService, PasswordHashService, TokenService],
  exports: [AuthService],
})
export class AuthModule {}
