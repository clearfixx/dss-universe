/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 🤖 Module: AI Core
 * 📄 File: apps/api/src/modules/ai-core/application/services/editor-ai.service.ts
 *
 * 🎯 Purpose:
 * Coordinates bounded, human-confirmed AI assistance for DSS Editor.
 *
 * 🧠 Responsibilities:
 * • validates command-specific source and instruction requirements;
 * • requires explicit confirmation before external processing;
 * • delegates generation through the provider abstraction;
 * • labels generated content and prevents autonomous publication.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import {
  BadRequestException,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';

import {
  AI_TEXT_PROVIDER,
  type AiTextProvider,
} from '../contracts/ai-text-provider.interface';
import {
  buildEditorAiPrompt,
  EDITOR_AI_PROMPT_VERSION,
} from '../prompts/editor-ai.prompts';
import {
  EditorAiCommand,
  type EditorAiCommandResult,
  type RunEditorAiCommand,
} from '../../domain/types/editor-ai-command.type';

const MAX_SOURCE_CHARACTERS = 12_000;
const MAX_INSTRUCTION_CHARACTERS = 1_000;
const MAX_GENERATED_CHARACTERS = 24_000;

@Injectable()
export class EditorAiService {
  constructor(
    @Inject(AI_TEXT_PROVIDER) private readonly provider: AiTextProvider,
  ) {}

  async run(input: RunEditorAiCommand): Promise<EditorAiCommandResult> {
    const sourceText = input.sourceText?.trim() || null;
    const instruction = input.instruction?.trim() || null;
    const language = input.language?.trim() || null;
    this.validate({ ...input, sourceText, instruction, language });

    const prompt = buildEditorAiPrompt({
      command: input.command,
      profile: input.profile,
      sourceText,
      instruction,
      language,
    });
    const generated = await this.provider.generate({
      instructions: prompt.instructions,
      input: prompt.userInput,
      safetyIdentifier: createHash('sha256')
        .update(input.actorId)
        .digest('hex'),
      maxOutputTokens: 2_000,
    });
    const generatedText = generated.text.trim();
    if (
      generatedText.length === 0 ||
      generatedText.length > MAX_GENERATED_CHARACTERS
    ) {
      throw new ServiceUnavailableException(
        'AI provider returned an invalid editor result.',
      );
    }

    return {
      generationId: generated.generationId,
      provider: generated.provider,
      model: generated.model,
      promptVersion: EDITOR_AI_PROMPT_VERSION,
      command: input.command,
      generatedText,
      inputTokens: generated.inputTokens,
      outputTokens: generated.outputTokens,
      generatedContentLabel: 'Generated with DSS AI Core — review before use.',
      requiresConfirmation: true,
    };
  }

  private validate(input: RunEditorAiCommand): void {
    if (!input.externalProcessingConfirmed) {
      throw new BadRequestException(
        'External AI processing must be explicitly confirmed.',
      );
    }
    if (
      (input.sourceText?.length ?? 0) > MAX_SOURCE_CHARACTERS ||
      (input.instruction?.length ?? 0) > MAX_INSTRUCTION_CHARACTERS
    ) {
      throw new BadRequestException('Editor AI command input is too large.');
    }
    const requiresSource = [
      EditorAiCommand.Rewrite,
      EditorAiCommand.Expand,
      EditorAiCommand.Shorten,
      EditorAiCommand.Explain,
    ].includes(input.command);
    if (requiresSource && !input.sourceText) {
      throw new BadRequestException(
        `${input.command} requires selected source text.`,
      );
    }
    if (
      [EditorAiCommand.Generate, EditorAiCommand.GenerateCode].includes(
        input.command,
      ) &&
      !input.instruction
    ) {
      throw new BadRequestException(
        `${input.command} requires an author instruction.`,
      );
    }
  }
}

/** Generate is a suggestion. Publish is a human decision. */
