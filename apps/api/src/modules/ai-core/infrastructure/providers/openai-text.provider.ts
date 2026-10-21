/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 🤖 Module: AI Core
 * 📄 File: apps/api/src/modules/ai-core/infrastructure/providers/openai-text.provider.ts
 *
 * 🎯 Purpose:
 * Implements structured text generation through the OpenAI Responses API.
 *
 * 🧠 Responsibilities:
 * • keeps OpenAI transport details behind the provider boundary;
 * • disables provider-side response storage;
 * • enforces timeout and structured output constraints;
 * • returns bounded usage evidence without exposing provider payloads.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type {
  AiTextGenerationRequest,
  AiTextGenerationResult,
  AiTextProvider,
} from '../../application/contracts/ai-text-provider.interface';

type OpenAiResponsesResult = {
  id?: unknown;
  model?: unknown;
  status?: unknown;
  output?: Array<{
    type?: unknown;
    content?: Array<{ type?: unknown; text?: unknown }>;
  }>;
  usage?: { input_tokens?: unknown; output_tokens?: unknown };
};

@Injectable()
export class OpenAiTextProvider implements AiTextProvider {
  constructor(private readonly config: ConfigService) {}

  async generate(
    request: AiTextGenerationRequest,
  ): Promise<AiTextGenerationResult> {
    const apiKey = this.config.get<string>('openai.apiKey');
    const model = this.config.get<string>('openai.model');
    if (!apiKey || !model) {
      throw new ServiceUnavailableException(
        'AI Core provider is not configured.',
      );
    }
    const baseUrl = (
      this.config.get<string>('openai.baseUrl') ?? 'https://api.openai.com/v1'
    ).replace(/\/$/, '');
    const timeoutMs = this.config.get<number>('openai.timeoutMs') ?? 30_000;

    let response: Response;
    try {
      response = await fetch(`${baseUrl}/responses`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${apiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model,
          instructions: request.instructions,
          input: request.input,
          max_output_tokens: request.maxOutputTokens,
          safety_identifier: request.safetyIdentifier,
          store: false,
          text: {
            format: {
              type: 'json_schema',
              name: 'dss_editor_command',
              strict: true,
              schema: {
                type: 'object',
                additionalProperties: false,
                properties: { content: { type: 'string' } },
                required: ['content'],
              },
            },
          },
        }),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      throw new ServiceUnavailableException('AI Core provider is unavailable.');
    }
    if (!response.ok) {
      throw new ServiceUnavailableException('AI Core provider request failed.');
    }

    const payload = (await response.json()) as OpenAiResponsesResult;
    const outputText = payload.output
      ?.flatMap((item) => item.content ?? [])
      .find((item) => item.type === 'output_text')?.text;
    const generationId = payload.id;
    const responseModel = payload.model;
    if (
      payload.status !== 'completed' ||
      typeof generationId !== 'string' ||
      typeof responseModel !== 'string' ||
      typeof outputText !== 'string'
    ) {
      throw new ServiceUnavailableException(
        'AI Core provider returned an incomplete response.',
      );
    }

    let structured: unknown;
    try {
      structured = JSON.parse(outputText) as unknown;
    } catch {
      throw new ServiceUnavailableException(
        'AI Core provider returned invalid structured output.',
      );
    }
    if (!this.isGeneratedContent(structured)) {
      throw new ServiceUnavailableException(
        'AI Core provider returned invalid structured output.',
      );
    }

    return {
      generationId,
      provider: 'openai',
      model: responseModel,
      text: structured.content,
      inputTokens: this.optionalInteger(payload.usage?.input_tokens),
      outputTokens: this.optionalInteger(payload.usage?.output_tokens),
    };
  }

  private isGeneratedContent(value: unknown): value is { content: string } {
    return (
      typeof value === 'object' &&
      value !== null &&
      typeof (value as { content?: unknown }).content === 'string'
    );
  }

  private optionalInteger(value: unknown): number | null {
    return Number.isSafeInteger(value) ? (value as number) : null;
  }
}

/** API keys stay backstage; generated text still waits for a human cue. */
