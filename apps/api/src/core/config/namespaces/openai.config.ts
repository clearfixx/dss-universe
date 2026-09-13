/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 🤖 Module: Configuration
 * 📄 File: apps/api/src/core/config/namespaces/openai.config.ts
 *
 * 🎯 Purpose:
 * Defines optional OpenAI provider transport configuration for AI Core.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { registerAs } from '@nestjs/config';

export default registerAs('openai', () => ({
  apiKey: process.env.OPENAI_API_KEY || '',
  model: process.env.OPENAI_MODEL || '',
  baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
  timeoutMs: Number(process.env.OPENAI_TIMEOUT_MS ?? 30_000),
}));

/** Empty provider credentials disable AI without disabling DSS. */
