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
 * 🧠 Responsibilities:
 * • binds the private inference provider and editor command service;
 * • registers the local permission-protected GraphQL resolver.
 *
 * 🏗️ Architecture:
 * Assembly module; no application provider is exported to neighboring features.
 *
 * ⚠️ Important:
 * Keep transport behavior unchanged; future consumers need an explicit reviewed contract.
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
  exports: [],
})
export class AiCoreModule {}

/** Optional intelligence belongs in one module, not scattered stardust. */
