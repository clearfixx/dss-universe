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

import type { ValidatedEditorDocument } from '../../contracts/editor-document-normalizer.contract';

export type EditorPreview = {
  html: string;
} & EditorProjection;

export type EditorProjection = ValidatedEditorDocument;

/** Canonical JSON is stored; every other field can be rebuilt. */
