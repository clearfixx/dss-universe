/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: DSS Editor Platform Tests
 * 📄 File: apps/api/src/modules/editor/application/services/editor-viewer-document-projector.service.spec.ts
 *
 * 🎯 Purpose:
 * Pins the minimal safe projection over real canonical validation and redaction.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { createEmptyEditorDocument } from '@dss/editor';
import { EditorHtmlRenderer } from '../../infrastructure/rendering/editor-html.renderer';
import type { EditorGateDecisions } from '../../domain/ports/editor-gate-decisions.interface';
import { EditorService } from './editor.service';
import { EditorContentDeliveryService } from './editor-content-delivery.service';
import { EditorViewerDocumentProjectorService } from './editor-viewer-document-projector.service';

describe('EditorViewerDocumentProjectorService', () => {
  const gateId = '85d2f9c0-59a9-4f2c-8f63-75cda3077bba';
  const document = createEmptyEditorDocument('NEWS');
  document.content.content = [
    {
      type: 'contentGate',
      attrs: { gateId },
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Synthetic secret' }],
        },
      ],
    },
  ];
  const raw = JSON.stringify(document);
  const evaluate = jest.fn<
    ReturnType<EditorGateDecisions['evaluate']>,
    Parameters<EditorGateDecisions['evaluate']>
  >();
  const service = new EditorViewerDocumentProjectorService(
    new EditorContentDeliveryService(
      new EditorService(
        new EditorHtmlRenderer({ highlight: () => Promise.resolve('') }),
      ),
      { evaluate },
    ),
  );
  beforeEach(() => {
    evaluate.mockReset();
  });
  it('returns only safe JSON, not raw canonical content or gate decisions', async () => {
    evaluate.mockResolvedValue({
      gateId,
      allowed: false,
      bypassed: false,
      unmet: ['COMMENTS'],
      notice: 'Denied',
    });
    const result = await service.project(raw, null);
    expect(Object.keys(result)).toEqual(['documentJson']);
    expect(result.documentJson).not.toContain('Synthetic secret');
    expect(evaluate.mock.calls).toEqual([[gateId, null]]);
  });
  it('preserves allowed JSON and opaque viewer context without leaking the verdict', async () => {
    evaluate.mockResolvedValue({
      gateId,
      allowed: true,
      bypassed: false,
      unmet: [],
      notice: 'Allowed',
    });
    expect(await service.project(raw, 'viewer')).toEqual({ documentJson: raw });
    expect(evaluate.mock.calls).toEqual([[gateId, 'viewer']]);
  });
  it('propagates decision failure and rejects invalid canonical JSON before policy lookup', async () => {
    evaluate.mockRejectedValue(new Error('Synthetic failure'));
    await expect(service.project(raw, 'viewer')).rejects.toThrow(
      'Synthetic failure',
    );
    evaluate.mockClear();
    await expect(service.project('{', null)).rejects.toThrow();
    await expect(
      service.project(JSON.stringify(document.content), null),
    ).rejects.toThrow();
    expect(evaluate).not.toHaveBeenCalled();
  });
});
