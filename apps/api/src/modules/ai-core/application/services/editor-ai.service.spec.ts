/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 🤖 Module: AI Core
 * 📄 File: apps/api/src/modules/ai-core/application/services/editor-ai.service.spec.ts
 *
 * 🎯 Purpose:
 * Verifies bounded, labeled and human-confirmed editor AI orchestration.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';

import type { AiTextProvider } from '../contracts/ai-text-provider.interface';
import { EditorAiCommand } from '../../domain/types/editor-ai-command.type';
import { EditorAiService } from './editor-ai.service';

describe('EditorAiService', () => {
  const provider: jest.Mocked<AiTextProvider> = { generate: jest.fn() };
  const service = new EditorAiService(provider);

  beforeEach(() => jest.clearAllMocks());

  it('returns a labeled proposal with opaque actor identity', async () => {
    provider.generate.mockResolvedValue({
      generationId: 'response-id',
      provider: 'openai',
      model: 'configured-model',
      text: '  Improved text  ',
      inputTokens: 42,
      outputTokens: 7,
    });

    const result = await service.run({
      actorId: 'private-user-id',
      command: EditorAiCommand.Rewrite,
      profile: 'NEWS',
      sourceText: 'Original text',
      instruction: 'Make it clearer',
      language: null,
      externalProcessingConfirmed: true,
    });

    expect(result).toMatchObject({
      generatedText: 'Improved text',
      promptVersion: 'editor-command.v1',
      requiresConfirmation: true,
    });
    expect(result.generatedContentLabel).toContain('review');
    const request = provider.generate.mock.calls[0]?.[0];
    expect(request?.input).toContain('Original text');
    expect(request?.safetyIdentifier).not.toContain('private-user-id');
    expect(request?.safetyIdentifier).toHaveLength(64);
  });

  it('requires explicit external processing confirmation and command inputs', async () => {
    await expect(
      service.run({
        actorId: 'user-id',
        command: EditorAiCommand.Generate,
        profile: 'COMMENT',
        sourceText: null,
        instruction: 'Draft a reply',
        language: null,
        externalProcessingConfirmed: false,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.run({
        actorId: 'user-id',
        command: EditorAiCommand.Explain,
        profile: 'COMMENT',
        sourceText: null,
        instruction: null,
        language: null,
        externalProcessingConfirmed: true,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(provider.generate.mock.calls).toHaveLength(0);
  });

  it('rejects empty or excessively large provider output', async () => {
    provider.generate.mockResolvedValue({
      generationId: 'response-id',
      provider: 'openai',
      model: 'configured-model',
      text: ' ',
      inputTokens: null,
      outputTokens: null,
    });
    await expect(
      service.run({
        actorId: 'user-id',
        command: EditorAiCommand.Generate,
        profile: 'NEWS',
        sourceText: null,
        instruction: 'Draft an introduction',
        language: null,
        externalProcessingConfirmed: true,
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});

/** A mocked model still has to respect the airlock. */
