/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: DSS Editor Platform
 * 📄 File: apps/api/src/modules/editor/application/services/editor-content-delivery.service.spec.ts
 *
 * 🎯 Purpose:
 * Verifies fail-closed Content Gate projection before editor document delivery.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { createEmptyEditorDocument } from '@dss/editor';

import type { ContentGatesService } from '../../../content-access/application/services/content-gates.service';
import type { ContentGateEvaluation } from '../../../content-access/domain/types/content-gate.type';
import type { EditorService } from './editor.service';
import { EditorContentDeliveryService } from './editor-content-delivery.service';

describe('EditorContentDeliveryService', () => {
  const gateId = '85d2f9c0-59a9-4f2c-8f63-75cda3077bba';
  const document = createEmptyEditorDocument('NEWS');
  document.content.content = [
    { type: 'paragraph', content: [{ type: 'text', text: 'Public' }] },
    {
      type: 'contentGate',
      attrs: { gateId },
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Secret' }] },
      ],
    },
    {
      type: 'contentGate',
      attrs: { gateId },
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Secret two' }] },
      ],
    },
  ];
  const editor = {
    normalize: jest.fn().mockReturnValue({ document }),
  } as unknown as jest.Mocked<EditorService>;
  const contentGates = {
    evaluate: jest.fn(),
  } as unknown as jest.Mocked<ContentGatesService>;
  const service = new EditorContentDeliveryService(editor, contentGates);

  beforeEach(() => jest.clearAllMocks());

  it('removes denied payloads and evaluates duplicate gate references once', async () => {
    contentGates.evaluate.mockResolvedValue(evaluation(false));

    const projection = await service.project('{}', 'viewer-id');

    expect(projection.documentJson).toContain('Public');
    expect(projection.documentJson).not.toContain('Secret');
    expect(projection.document.content.content?.[1]).toEqual({
      type: 'contentGate',
      attrs: { gateId },
    });
    expect(projection.gates).toEqual([
      {
        gateId,
        allowed: false,
        bypassed: false,
        unmet: ['REPUTATION'],
        notice: 'Hidden content requirements are not satisfied.',
      },
    ]);
    expect(contentGates.evaluate.mock.calls).toHaveLength(1);
  });

  it('retains protected payloads and exposes an explicit bypass notice', async () => {
    contentGates.evaluate.mockResolvedValue(evaluation(true, true));

    const projection = await service.project('{}', 'premium-id');

    expect(projection.documentJson).toContain('Secret');
    expect(projection.gates[0]).toMatchObject({
      allowed: true,
      bypassed: true,
      notice: 'Premium bypass is active.',
    });
  });

  it('fails closed when gate evaluation cannot establish access', async () => {
    contentGates.evaluate.mockRejectedValue(new Error('Gate unavailable'));

    await expect(service.project('{}', 'viewer-id')).rejects.toThrow(
      'Gate unavailable',
    );
  });

  function evaluation(
    allowed: boolean,
    bypassed = false,
  ): ContentGateEvaluation {
    return {
      gate: {
        id: gateId,
        ownerId: 'owner-id',
        operator: 'ALL',
        requirements: [
          {
            id: 'requirement-id',
            kind: 'REPUTATION',
            threshold: 100,
            groupKey: null,
          },
        ],
        createdAt: new Date('2026-09-13T00:00:00.000Z'),
        updatedAt: new Date('2026-09-13T00:00:00.000Z'),
      },
      allowed,
      bypassed,
      unmet: allowed ? [] : ['REPUTATION'],
      notice: bypassed
        ? 'Premium bypass is active.'
        : allowed
          ? 'Content Gate requirements are satisfied.'
          : 'Hidden content requirements are not satisfied.',
    };
  }
});

/** The safest hidden-content test is the one that searches for the secret. */
