/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 🤖 Module: AI Core
 * 📄 File: apps/api/src/modules/ai-core/infrastructure/providers/openai-text.provider.spec.ts
 *
 * 🎯 Purpose:
 * Verifies the private, structured OpenAI Responses transport contract.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { ServiceUnavailableException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';

import { OpenAiTextProvider } from './openai-text.provider';

describe('OpenAiTextProvider', () => {
  const config = {
    get: jest.fn(
      (key: string) =>
        ({
          'openai.apiKey': 'test-key',
          'openai.model': 'configured-model',
          'openai.baseUrl': 'https://api.openai.test/v1',
          'openai.timeoutMs': 5_000,
        })[key],
    ),
  } as unknown as jest.Mocked<ConfigService>;
  const provider = new OpenAiTextProvider(config);

  afterEach(() => jest.restoreAllMocks());

  it('uses non-stored structured Responses and returns usage evidence', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'response-id',
          model: 'configured-model-2026-01-01',
          status: 'completed',
          output: [
            {
              type: 'message',
              content: [
                {
                  type: 'output_text',
                  text: JSON.stringify({ content: 'Generated content' }),
                },
              ],
            },
          ],
          usage: { input_tokens: 20, output_tokens: 5 },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );

    await expect(
      provider.generate({
        instructions: 'System boundary',
        input: 'User content',
        safetyIdentifier: 'opaque-user',
        maxOutputTokens: 500,
      }),
    ).resolves.toEqual({
      generationId: 'response-id',
      provider: 'openai',
      model: 'configured-model-2026-01-01',
      text: 'Generated content',
      inputTokens: 20,
      outputTokens: 5,
    });
    const request = fetchMock.mock.calls[0]?.[1];
    expect(typeof request?.body).toBe('string');
    const body = JSON.parse(
      typeof request?.body === 'string' ? request.body : '',
    ) as {
      store: boolean;
      safety_identifier: string;
      text: { format: { type: string; strict: boolean } };
    };
    expect(request?.headers).toMatchObject({
      authorization: 'Bearer test-key',
    });
    expect(body).toMatchObject({
      store: false,
      safety_identifier: 'opaque-user',
      text: { format: { type: 'json_schema', strict: true } },
    });
  });

  it('fails safely when provider configuration is absent', async () => {
    const disabledConfig = {
      get: jest.fn().mockReturnValue(''),
    } as unknown as jest.Mocked<ConfigService>;

    await expect(
      new OpenAiTextProvider(disabledConfig).generate({
        instructions: 'System boundary',
        input: 'User content',
        safetyIdentifier: 'opaque-user',
        maxOutputTokens: 500,
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});

/** Transport tests inspect the envelope, never a real user's words. */
