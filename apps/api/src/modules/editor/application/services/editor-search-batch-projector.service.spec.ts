/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: DSS Editor Tests
 * 📄 File: apps/api/src/modules/editor/application/services/editor-search-batch-projector.service.spec.ts
 *
 * 🎯 Purpose:
 * Verifies bounded canonical batch redaction, reached gates and explicit scope closure.
 *
 * 🧠 Responsibilities:
 * • covers ordered output, fresh scopes and input/concurrency limits;
 * • proves failed sibling work is drained before closing or returning.
 *
 * 🏗️ Architecture:
 * Real Editor validation/redaction; synthetic verdicts are not IAM authorization evidence.
 *
 * ⚠️ Important:
 * Migrated query E2E must separately prove real membership/revocation behavior.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { createEmptyEditorDocument, type EditorNode } from '@dss/editor';
import type { EditorGateDecisionScope } from '../../domain/ports/editor-gate-decision-scopes.interface';
import type { EditorHtmlRenderer } from '../../infrastructure/rendering/editor-html.renderer';
import { EditorContentDeliveryService } from './editor-content-delivery.service';
import { EditorSearchBatchProjectorService } from './editor-search-batch-projector.service';
import { EditorService } from './editor.service';

describe('EditorSearchBatchProjectorService', () => {
  const first = '85d2f9c0-59a9-4f2c-8f63-75cda3077bba';
  const second = '85d2f9c0-59a9-4f2c-8f63-75cda3077bbb';
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
  function verdict(gateId: string, allowed = false) {
    return { gateId, allowed, bypassed: false, unmet: [], notice: 'Synthetic' };
  }
  function harness() {
    const evaluate = jest
      .fn<
        ReturnType<EditorGateDecisionScope['evaluate']>,
        Parameters<EditorGateDecisionScope['evaluate']>
      >()
      .mockImplementation((id) => Promise.resolve(verdict(id)));
    const close = jest.fn<void, []>();
    const open = jest
      .fn<EditorGateDecisionScope, [string]>()
      .mockImplementation(() => ({ evaluate, close }));
    const editor = new EditorService({} as EditorHtmlRenderer);
    const legacyEvaluate = jest
      .fn()
      .mockRejectedValue(new Error('Legacy provider must not run.'));
    const delivery = new EditorContentDeliveryService(editor, {
      evaluate: legacyEvaluate,
    });
    return {
      service: new EditorSearchBatchProjectorService(delivery, { open }),
      evaluate,
      open,
      close,
      delivery,
      legacyEvaluate,
    };
  }
  it('preserves input order, phrase semantics and fresh scopes without returning definitions or denied text', async () => {
    const h = harness();
    const input = [
      raw(
        paragraph('alpha'),
        gate(first, paragraph('secret')),
        paragraph('gamma'),
      ),
      raw(paragraph('visible')),
    ];
    expect(await h.service.project(input, 'viewer')).toEqual([
      { searchText: 'alpha gamma' },
      { searchText: 'visible' },
    ]);
    expect(h.open).toHaveBeenCalledWith('viewer');
    expect(h.close).toHaveBeenCalledTimes(1);
    h.evaluate.mockResolvedValue(verdict(first, true));
    expect(await h.service.project(input.slice(0, 1), 'viewer')).toEqual([
      { searchText: 'alpha secret gamma' },
    ]);
    expect(h.open).toHaveBeenCalledTimes(2);
    expect(h.close).toHaveBeenCalledTimes(2);
    expect(h.legacyEvaluate).not.toHaveBeenCalled();
  });
  it('does not evaluate a denied gate descendant', async () => {
    const h = harness();
    await expect(
      h.service.project(
        [raw(gate(first, gate(second, paragraph('secret'))))],
        'viewer',
      ),
    ).resolves.toEqual([{ searchText: '' }]);
    expect(h.evaluate.mock.calls).toEqual([[first]]);
  });
  it('bounds 64 documents to four concurrent redactions', async () => {
    const h = harness();
    let active = 0,
      maximum = 0;
    h.evaluate.mockImplementation(async (id) => {
      active++;
      maximum = Math.max(maximum, active);
      await Promise.resolve();
      active--;
      return verdict(id);
    });
    const documents = Array.from({ length: 64 }, () =>
      raw(gate(first, paragraph('private'))),
    );
    expect(await h.service.project(documents, 'viewer')).toHaveLength(64);
    expect(maximum).toBe(4);
    expect(active).toBe(0);
    expect(h.evaluate).toHaveBeenCalledTimes(64);
    expect(h.open).toHaveBeenCalledTimes(1);
    expect(h.close).toHaveBeenCalledTimes(1);
  });
  it('does not open a scope for an empty batch and rejects oversized/blank-viewer input', async () => {
    const h = harness();
    expect(await h.service.project([], 'viewer')).toEqual([]);
    await expect(
      h.service.project(
        Array.from({ length: 65 }, () => raw(paragraph('visible'))),
        'viewer',
      ),
    ).rejects.toThrow('at most 64');
    await expect(
      h.service.project([raw(paragraph('visible'))], ' '),
    ).rejects.toThrow('requires a viewer');
    expect(h.open).not.toHaveBeenCalled();
  });
  it('closes the scope after invalid NEWS/profile validation without publishing partial text', async () => {
    const h = harness();
    await expect(
      h.service.project(
        [JSON.stringify(createEmptyEditorDocument('COMMENT'))],
        'viewer',
      ),
    ).rejects.toThrow();
    expect(h.close).toHaveBeenCalledTimes(1);
    expect(h.evaluate).not.toHaveBeenCalled();
  });
  it('drains sibling gate work within a failed document before closing the scope', async () => {
    const h = harness();
    let release!: () => void, reached!: () => void;
    const waiting = new Promise<
      Awaited<ReturnType<EditorGateDecisionScope['evaluate']>>
    >((resolve) => {
      release = () => resolve(verdict(second));
    });
    const observed = new Promise<void>((resolve) => {
      reached = resolve;
    });
    h.evaluate.mockImplementation((id) => {
      if (id === first) return Promise.reject(new Error('Synthetic outage'));
      reached();
      return waiting;
    });
    const running = h.service
      .project(
        [
          raw(
            gate(first, paragraph('private')),
            gate(second, paragraph('private')),
          ),
        ],
        'viewer',
      )
      .catch((error: unknown) => error);
    await observed;
    expect(h.close).not.toHaveBeenCalled();
    release();
    expect(await running).toEqual(new Error('Synthetic outage'));
    expect(h.close).toHaveBeenCalledTimes(1);
  });
});
