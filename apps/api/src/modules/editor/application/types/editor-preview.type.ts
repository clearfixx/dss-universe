/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: DSS Editor Platform
 * 📄 File: apps/api/src/modules/editor/application/types/editor-preview.type.ts
 *
 * 🎯 Purpose:
 * Defines the validated server projection returned for an editor document.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type { EditorDocument } from '@dss/editor';

export type EditorPreview = {
  document: EditorDocument;
  canonicalJson: string;
  html: string;
  plainText: string;
  searchText: string;
};

/** Canonical JSON is stored; every other field can be rebuilt. */
