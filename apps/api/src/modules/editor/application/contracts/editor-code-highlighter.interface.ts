/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: DSS Editor Platform
 * 📄 File: apps/api/src/modules/editor/application/contracts/editor-code-highlighter.interface.ts
 *
 * 🎯 Purpose:
 * Defines the application boundary for server-side code highlighting.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export const EDITOR_CODE_HIGHLIGHTER = Symbol('EDITOR_CODE_HIGHLIGHTER');

export interface EditorCodeHighlighter {
  highlight(code: string, language: string): Promise<string>;
}

/** Syntax colors are infrastructure; editor semantics remain portable. */
