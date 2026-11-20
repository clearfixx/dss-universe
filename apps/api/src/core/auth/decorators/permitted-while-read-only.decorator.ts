/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Core / Authentication
 * 📄 File: apps/api/src/core/auth/decorators/permitted-while-read-only.decorator.ts
 *
 * 🎯 Purpose:
 * Marks account-safety operations that stay available to read-only subjects.
 *
 * ⚠️ Important:
 * Use only for session, credential, privacy and safety operations — never for
 * content, social or upload writes.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { SetMetadata } from '@nestjs/common';

export const PERMITTED_WHILE_READ_ONLY_KEY = 'dss:permitted-while-read-only';

export const PermittedWhileReadOnly = () =>
  SetMetadata(PERMITTED_WHILE_READ_ONLY_KEY, true);
