/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Core Authentication
 * 📄 File: apps/api/src/core/auth/auth-core.module.ts
 *
 * 🎯 Purpose:
 * Provides shared JWT framework infrastructure and legacy role guards.
 *
 * 🧠 Responsibilities:
 * • configures and exports JwtModule;
 * • registers shared legacy role guards.
 *
 * 🏗️ Architecture:
 * Technical Nest module. AuthModule composes JwtStrategy with its session capability.
 *
 * ⚠️ Important:
 * Core does not import business modules or choose authentication persistence adapters.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { RolesGuard } from './guards/roles.guard';

@Module({
  imports: [JwtModule.register({})],
  providers: [RolesGuard],
  exports: [JwtModule, RolesGuard],
})
export class AuthCoreModule {}
