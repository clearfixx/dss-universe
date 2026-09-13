/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 🤖 Module: AI Core
 * 📄 File: apps/api/src/modules/ai-core/ai-core.module.ts
 *
 * 🎯 Purpose:
 * Composes provider-neutral AI Core application and GraphQL boundaries.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Module } from '@nestjs/common';

import { AI_TEXT_PROVIDER } from './application/contracts/ai-text-provider.interface';
import { EditorAiService } from './application/services/editor-ai.service';
import { OpenAiTextProvider } from './infrastructure/providers/openai-text.provider';
import { EditorAiResolver } from './presentation/graphql/editor-ai.graphql';

@Module({
  providers: [
    EditorAiService,
    OpenAiTextProvider,
    { provide: AI_TEXT_PROVIDER, useExisting: OpenAiTextProvider },
    EditorAiResolver,
  ],
  exports: [EditorAiService],
})
export class AiCoreModule {}

/** Optional intelligence belongs in one module, not scattered stardust. */
