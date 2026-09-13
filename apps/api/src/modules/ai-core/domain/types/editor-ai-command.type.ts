/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 🤖 Module: AI Core
 * 📄 File: apps/api/src/modules/ai-core/domain/types/editor-ai-command.type.ts
 *
 * 🎯 Purpose:
 * Defines provider-neutral editor command inputs, outputs and usage evidence.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type { EditorProfile } from '@dss/editor';

export enum EditorAiCommand {
  Generate = 'GENERATE',
  Rewrite = 'REWRITE',
  Expand = 'EXPAND',
  Shorten = 'SHORTEN',
  Explain = 'EXPLAIN',
  GenerateCode = 'GENERATE_CODE',
}

export type RunEditorAiCommand = {
  actorId: string;
  command: EditorAiCommand;
  profile: EditorProfile;
  sourceText: string | null;
  instruction: string | null;
  language: string | null;
  externalProcessingConfirmed: boolean;
};

export type EditorAiCommandResult = {
  generationId: string;
  provider: string;
  model: string;
  promptVersion: string;
  command: EditorAiCommand;
  generatedText: string;
  inputTokens: number | null;
  outputTokens: number | null;
  generatedContentLabel: string;
  requiresConfirmation: true;
};

/** AI may propose the words; only a human may put them on the flight plan. */
