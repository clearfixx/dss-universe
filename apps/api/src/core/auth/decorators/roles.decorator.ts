/**
 * DSS File Passport 🛰️
 * File: apps/api/src/core/auth/decorators/roles.decorator.ts
 * Purpose: Defines role metadata for legacy role-based route protection.
 * Phase: 2.5.9 — Architecture Cleanup
 * Architecture: Auth decorator
 *
 * Notes:
 * - Prefer permissions for new backend authorization.
 * - This decorator stays only for compatibility.
 */

import { SetMetadata } from '@nestjs/common';

import { ROLES_KEY } from '../constants/roles.constant';

export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
