/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: DSS Editor Platform
 * 📄 File: apps/api/src/modules/editor/infrastructure/rendering/shiki-editor-code-highlighter.ts
 *
 * 🎯 Purpose:
 * Highlights validated DSS Editor code blocks with the VS Code dark theme.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Injectable } from '@nestjs/common';

import type { EditorCodeHighlighter } from '../../application/contracts/editor-code-highlighter.interface';

@Injectable()
export class ShikiEditorCodeHighlighter implements EditorCodeHighlighter {
  private shiki?: Promise<typeof import('shiki')>;

  async highlight(code: string, language: string): Promise<string> {
    const { codeToHtml } = await (this.shiki ??= import('shiki'));

    return codeToHtml(code, {
      lang: language,
      theme: 'dark-plus',
    });
  }
}

/** One cached highlighter keeps every code block bright without reheating the stars. */
