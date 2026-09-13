/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 🤖 Module: AI Core
 * 📄 File: apps/api/src/modules/ai-core/application/contracts/ai-text-provider.interface.ts
 *
 * 🎯 Purpose:
 * Defines the provider-neutral structured text generation boundary.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export const AI_TEXT_PROVIDER = Symbol('AI_TEXT_PROVIDER');

export type AiTextGenerationRequest = {
  instructions: string;
  input: string;
  safetyIdentifier: string;
  maxOutputTokens: number;
};

export type AiTextGenerationResult = {
  generationId: string;
  provider: string;
  model: string;
  text: string;
  inputTokens: number | null;
  outputTokens: number | null;
};

export interface AiTextProvider {
  generate(request: AiTextGenerationRequest): Promise<AiTextGenerationResult>;
}

/** Providers supply inference; AI Core owns product policy. */
