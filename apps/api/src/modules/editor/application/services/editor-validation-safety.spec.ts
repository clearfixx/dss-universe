/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: DSS Editor API validation tests
 * 📄 File: apps/api/src/modules/editor/application/services/editor-validation-safety.spec.ts
 *
 * 🎯 Purpose:
 * Prove unsafe documents fail before rendering or Content Gate evaluation.
 *
 * 🧠 Responsibilities:
 * • exercise the actual shared validator through API services;
 * • preserve controlled BadRequest mapping and valid canonical projections;
 * • prevent malformed or deep payloads from reaching downstream providers.
 *
 * 🏗️ Architecture:
 * Editor-owned unit boundary tests; only rendering and gate IO are mocked.
 *
 * ⚠️ Important:
 * No validation mock, arbitrary exception suppression or timeout relaxation.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { BadRequestException } from '@nestjs/common';
import type { EditorHtmlRenderer } from '../../infrastructure/rendering/editor-html.renderer';
import type { EditorGateDecisions } from '../../domain/ports/editor-gate-decisions.interface';
import { EditorContentDeliveryService } from './editor-content-delivery.service';
import { EditorService } from './editor.service';

function documentWith(node: unknown): string {
  return JSON.stringify({
    schemaVersion: 1,
    profile: 'NEWS',
    content: { type: 'doc', content: [node] },
  });
}

function nestedJson(depth: number): string {
  return (
    '{"schemaVersion":1,"profile":"NEWS","content":{"type":"doc","content":[' +
    '{"type":"blockquote","content":['.repeat(depth - 2) +
    '{"type":"paragraph","content":[{"type":"text","text":"boundary"}]}' +
    ']}'.repeat(depth - 2) +
    ']}}'
  );
}

describe('Editor API unsafe JSON boundary', () => {
  const render = jest.fn().mockResolvedValue('<p>boundary</p>');
  const renderer = { render } as unknown as EditorHtmlRenderer;
  const gates = {
    evaluate: jest.fn(),
  } satisfies jest.Mocked<EditorGateDecisions>;
  const editor = new EditorService(renderer);
  const delivery = new EditorContentDeliveryService(editor, gates);
  beforeEach(() => jest.clearAllMocks());

  it.each([
    ['null child', documentWith(null), 'NODE_TYPE'],
    [
      'object content',
      documentWith({ type: 'paragraph', content: {} }),
      'CONTENT_TYPE',
    ],
    [
      'object marks',
      documentWith({ type: 'paragraph', marks: {} }),
      'MARKS_TYPE',
    ],
    [
      'null attributes',
      documentWith({ type: 'paragraph', attrs: null }),
      'ATTRIBUTES_TYPE',
    ],
    [
      'mark attributes array',
      documentWith({
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'marked',
            marks: [{ type: 'bold', attrs: [] }],
          },
        ],
      }),
      'MARK_ATTRIBUTES_TYPE',
    ],
    ['depth 65', nestedJson(65), 'DEPTH_LIMIT'],
    ['depth 12000', nestedJson(12000), 'DEPTH_LIMIT'],
  ])(
    'rejects %s before any rendering or gate IO',
    async (_label, json, code) => {
      let caught: unknown;
      try {
        editor.normalize(json);
      } catch (error) {
        caught = error;
      }
      expect(caught).toBeInstanceOf(BadRequestException);
      const exception = caught as BadRequestException;
      expect(exception.getStatus()).toBe(400);
      expect(exception.getResponse()).toMatchObject({
        statusCode: 400,
        message: 'Editor document validation failed.',
        errors: [{ code }],
      });
      await expect(editor.preview(json)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      await expect(
        delivery.project(json, 'synthetic-viewer'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(render).not.toHaveBeenCalled();
      expect(gates.evaluate).not.toHaveBeenCalled();
    },
  );

  it('preserves valid depth-64 canonical projections and renderer input', async () => {
    const json = nestedJson(64);
    const preview = await editor.preview(json);
    expect(preview.canonicalJson).toBe(json);
    expect(preview.plainText).toBe('boundary');
    expect(preview.searchText).toBe('boundary');
    expect(render).toHaveBeenCalledWith(JSON.parse(json) as unknown);
    expect((await delivery.project(json, null)).documentJson).toBe(json);
    expect(gates.evaluate).not.toHaveBeenCalled();
  });

  it('keeps the existing UTF-8 byte limit before parsing and IO', async () => {
    const oversized = documentWith({
      type: 'paragraph',
      content: [{ type: 'text', text: '🙂'.repeat(250_001) }],
    });
    expect(oversized.length).toBeLessThan(1_000_000);
    expect(Buffer.byteLength(oversized, 'utf8')).toBeGreaterThan(1_000_000);
    await expect(editor.preview(oversized)).rejects.toThrow(
      'Editor document JSON has an invalid size.',
    );
    expect(render).not.toHaveBeenCalled();
    expect(gates.evaluate).not.toHaveBeenCalled();
  });
});
