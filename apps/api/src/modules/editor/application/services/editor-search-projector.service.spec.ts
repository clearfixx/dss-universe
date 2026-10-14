/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: DSS Editor Platform Tests
 * 📄 File: apps/api/src/modules/editor/application/services/editor-search-projector.service.spec.ts
 *
 * 🎯 Purpose:
 * Verifies search projections over real canonical validation and Editor redaction.
 *
 * 🧠 Responsibilities:
 * • proves public projection equivalence to denied delivery without policy calls;
 * • covers reachable gate decisions, no cross-request cache and phrase semantics;
 * • pins profile/size validation and provider failures before search evidence escapes.
 *
 * 🏗️ Architecture:
 * Owner-level tests; policy verdict fixtures do not certify IAM or public News search.
 *
 * ⚠️ Important:
 * Migrated News response and performance tests are still required for DEBT-053 acceptance.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { BadRequestException } from '@nestjs/common';
import {
  createEmptyEditorDocument,
  projectEditorSearchText,
  type EditorNode,
} from '@dss/editor';
import type { EditorGateDecisions } from '../../domain/ports/editor-gate-decisions.interface';
import type { EditorHtmlRenderer } from '../../infrastructure/rendering/editor-html.renderer';
import { EditorContentDeliveryService } from './editor-content-delivery.service';
import { EditorSearchProjectorService } from './editor-search-projector.service';
import { EditorService } from './editor.service';

describe('EditorSearchProjectorService', () => {
  const first = '85d2f9c0-59a9-4f2c-8f63-75cda3077bba';
  const second = '85d2f9c0-59a9-4f2c-8f63-75cda3077bbb';
  const evaluate = jest.fn<
    ReturnType<EditorGateDecisions['evaluate']>,
    Parameters<EditorGateDecisions['evaluate']>
  >();
  const editor = new EditorService({} as EditorHtmlRenderer);
  const delivery = new EditorContentDeliveryService(editor, { evaluate });
  const projector = new EditorSearchProjectorService(editor, delivery);

  function paragraph(text: string): EditorNode {
    return { type: 'paragraph', content: [{ type: 'text', text }] };
  }
  function gate(id: string, ...content: EditorNode[]): EditorNode {
    return { type: 'contentGate', attrs: { gateId: id }, content };
  }
  function raw(...content: EditorNode[]) {
    const document = createEmptyEditorDocument('NEWS');
    document.content.content = content;
    return JSON.stringify(document);
  }
  function verdict(gateId: string, allowed: boolean) {
    return {
      gateId,
      allowed,
      bypassed: false,
      unmet: [],
      notice: 'Synthetic decision',
    };
  }
  beforeEach(() => {
    evaluate.mockReset();
    evaluate.mockImplementation((id) => Promise.resolve(verdict(id, false)));
  });

  it('projects public text with zero provider calls and leaves authored JSON intact', () => {
    const input = raw(
      paragraph('Public'),
      gate(first, paragraph('Secret')),
      paragraph('Ending'),
    );
    expect(projector.projectPublic(input)).toEqual({
      searchText: 'public ending',
      hasContentGates: true,
    });
    expect(evaluate).not.toHaveBeenCalled();
    expect(editor.normalize(input).searchText).toBe('public secret ending');
  });

  it.each([
    ['empty', raw({ type: 'paragraph' })],
    ['ungated', raw(paragraph('Visible'))],
    [
      'between paragraphs',
      raw(
        paragraph('alpha'),
        gate(first, paragraph('secret')),
        paragraph('gamma'),
      ),
    ],
    [
      'nested',
      raw(
        gate(first, gate(second, paragraph('nested-secret'))),
        paragraph('visible'),
      ),
    ],
    [
      'repeated',
      raw(
        gate(first, paragraph('one')),
        paragraph('visible'),
        gate(first, paragraph('two')),
      ),
    ],
    [
      'inline unicode',
      raw(
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'e' },
            { type: 'text', text: '\u0301 \u{1ccd6} ΣΟΣ İ' },
          ],
        },
        gate(first, paragraph('secret')),
      ),
    ],
  ])(
    'matches the actual denied-delivery text for %s',
    async (_label, input) => {
      const expected = projectEditorSearchText(
        (await delivery.project(input, null)).document,
      );
      expect(projector.projectPublic(input).searchText).toBe(expected);
    },
  );

  it('preserves allowed text and normalizes the entire viewer-visible projection', async () => {
    evaluate.mockImplementation((id) => Promise.resolve(verdict(id, true)));
    const input = raw(
      paragraph('alpha'),
      gate(first, paragraph('secret')),
      paragraph('gamma'),
    );
    expect(await projector.projectForViewer(input, 'viewer')).toEqual({
      searchText: 'alpha secret gamma',
    });
    expect(evaluate.mock.calls).toEqual([[first, 'viewer']]);
    expect(projector.projectPublic(input).searchText).toBe('alpha gamma');
  });

  it('does not reuse a denial across viewers or subsequent requests', async () => {
    evaluate
      .mockResolvedValueOnce(verdict(first, true))
      .mockResolvedValueOnce(verdict(first, false))
      .mockResolvedValueOnce(verdict(first, true));
    const input = raw(gate(first, paragraph('secret')), paragraph('public'));
    expect(await projector.projectForViewer(input, 'viewer-one')).toEqual({
      searchText: 'secret public',
    });
    expect(await projector.projectForViewer(input, 'viewer-one')).toEqual({
      searchText: 'public',
    });
    expect(await projector.projectForViewer(input, 'viewer-two')).toEqual({
      searchText: 'secret public',
    });
    expect(evaluate.mock.calls).toEqual([
      [first, 'viewer-one'],
      [first, 'viewer-one'],
      [first, 'viewer-two'],
    ]);
  });

  it('evaluates repeated reachable gates once and never queries a denied ancestor descendant', async () => {
    const input = raw(
      gate(first, gate(second, paragraph('nested-secret'))),
      gate(first, paragraph('secret')),
      paragraph('visible'),
    );
    expect(await projector.projectForViewer(input, 'viewer')).toEqual({
      searchText: 'visible',
    });
    expect(evaluate.mock.calls).toEqual([[first, 'viewer']]);
    evaluate.mockClear();
    evaluate.mockImplementation((id) =>
      Promise.resolve(verdict(id, id === first)),
    );
    expect(await projector.projectForViewer(input, 'viewer')).toEqual({
      searchText: 'secret visible',
    });
    expect(evaluate.mock.calls).toEqual([
      [first, 'viewer'],
      [second, 'viewer'],
    ]);
  });

  it('propagates decision errors without raw text or partial-success fallback', async () => {
    evaluate.mockRejectedValue(new Error('Synthetic unavailable'));
    await expect(
      projector.projectForViewer(
        raw(paragraph('public'), gate(first, paragraph('secret'))),
        'viewer',
      ),
    ).rejects.toThrow('Synthetic unavailable');
  });

  it.each([
    ['malformed', '{'],
    ['oversized', 'x'.repeat(1_000_001)],
    ['wrong profile', JSON.stringify(createEmptyEditorDocument('COMMENT'))],
    [
      'legacy unwrapped node',
      JSON.stringify({ type: 'doc', content: [paragraph('legacy')] }),
    ],
    ['invalid node', raw({ type: 'html', attrs: { source: '<script />' } })],
  ])('rejects %s input before any policy lookup', async (_label, input) => {
    expect(() => projector.projectPublic(input)).toThrow(BadRequestException);
    await expect(projector.projectForViewer(input, 'viewer')).rejects.toThrow(
      BadRequestException,
    );
    expect(evaluate).not.toHaveBeenCalled();
  });
});
