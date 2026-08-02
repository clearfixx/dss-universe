/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: DSS Editor Platform
 * 📄 File: apps/api/src/modules/editor/application/services/editor.service.spec.ts
 *
 * 🎯 Purpose:
 * Verifies parsing, validation and projection coordination for editor previews.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { BadRequestException } from '@nestjs/common';
import { createEmptyEditorDocument } from '@dss/editor';

import type { EditorHtmlRenderer } from '../../infrastructure/rendering/editor-html.renderer';
import { EditorService } from './editor.service';

describe('EditorService', () => {
  const renderer = {
    render: jest.fn().mockResolvedValue('<p></p>'),
  } as unknown as jest.Mocked<EditorHtmlRenderer>;
  const service = new EditorService(renderer);

  beforeEach(() => jest.clearAllMocks());

  it('returns canonical and searchable projections for a valid document', async () => {
    const document = createEmptyEditorDocument('COMPACT');
    document.content.content = [
      { type: 'paragraph', content: [{ type: 'text', text: 'Привіт DSS' }] },
    ];

    const preview = await service.preview(JSON.stringify(document));

    expect(preview.canonicalJson).toBe(JSON.stringify(document));
    expect(preview.plainText).toBe('Привіт DSS');
    expect(preview.searchText).toBe('привіт dss');
    expect(renderer.render.mock.calls).toEqual([[document]]);
  });

  it('rejects invalid JSON and unsupported nodes', async () => {
    await expect(service.preview('{')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(
      service.preview(
        JSON.stringify({
          schemaVersion: 1,
          profile: 'COMPACT',
          content: { type: 'doc', content: [{ type: 'html' }] },
        }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

/** A green preview test means validation and rendering share the same flight plan. */
