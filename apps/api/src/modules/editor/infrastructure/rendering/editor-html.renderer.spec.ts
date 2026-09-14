/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: DSS Editor Platform
 * 📄 File: apps/api/src/modules/editor/infrastructure/rendering/editor-html.renderer.spec.ts
 *
 * 🎯 Purpose:
 * Verifies safe HTML projection, alignment and code-highlighter delegation.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type { EditorDocument } from '@dss/editor';

import type { EditorCodeHighlighter } from '../../application/contracts/editor-code-highlighter.interface';
import { EditorHtmlRenderer } from './editor-html.renderer';

describe('EditorHtmlRenderer', () => {
  const highlight = jest
    .fn<
      ReturnType<EditorCodeHighlighter['highlight']>,
      Parameters<EditorCodeHighlighter['highlight']>
    >()
    .mockResolvedValue('<pre class="shiki"></pre>');
  const highlighter: jest.Mocked<EditorCodeHighlighter> = {
    highlight,
  };
  const renderer = new EditorHtmlRenderer(highlighter);

  beforeEach(() => jest.clearAllMocks());

  it('renders validated center alignment and escapes text content', async () => {
    const document: EditorDocument = {
      schemaVersion: 1,
      profile: 'COMMENT',
      content: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            attrs: { textAlign: 'center' },
            content: [{ type: 'text', text: '<launch>' }],
          },
        ],
      },
    };

    await expect(renderer.render(document)).resolves.toBe(
      '<p style="text-align: center">&lt;launch&gt;</p>',
    );
  });

  it('delegates code rendering through the infrastructure boundary', async () => {
    const document: EditorDocument = {
      schemaVersion: 1,
      profile: 'FORUM_REPLY',
      content: {
        type: 'doc',
        content: [
          {
            type: 'codeBlock',
            attrs: { language: 'typescript' },
            content: [{ type: 'text', text: 'const dss = true;' }],
          },
        ],
      },
    };

    await expect(renderer.render(document)).resolves.toContain('shiki');
    expect(highlight).toHaveBeenCalledWith('const dss = true;', 'typescript');
  });

  it('renders document-grade structures and a heading-derived TOC', async () => {
    const document: EditorDocument = {
      schemaVersion: 1,
      profile: 'WIKI',
      content: {
        type: 'doc',
        content: [
          { type: 'tableOfContents' },
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'DSS Architecture' }],
          },
          {
            type: 'taskList',
            content: [
              {
                type: 'taskItem',
                attrs: { checked: true },
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'Ship it' }],
                  },
                ],
              },
            ],
          },
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Verified' },
              { type: 'footnoteReference', attrs: { noteId: 'note-1' } },
            ],
          },
          {
            type: 'footnoteDefinition',
            attrs: { noteId: 'note-1' },
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Source' }],
              },
            ],
          },
        ],
      },
    };

    const html = await renderer.render(document);
    expect(html).toContain('href="#dss-architecture"');
    expect(html).toContain('<h2 id="dss-architecture">');
    expect(html).toContain('data-checked="true"');
    expect(html).toContain('id="footnote-note-1"');
  });
});

/** Safe projections let rich documents shine without inviting scripts aboard. */
