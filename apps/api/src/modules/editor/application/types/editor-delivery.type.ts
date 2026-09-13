/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: DSS Editor Platform
 * 📄 File: apps/api/src/modules/editor/application/types/editor-delivery.type.ts
 *
 * 🎯 Purpose:
 * Defines the viewer-safe editor document projection and Content Gate verdicts.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type { EditorDocument } from '@dss/editor';

import type { ContentGateRequirementKind } from '../../../content-access/domain/types/content-gate.type';

export type EditorContentGateDecision = {
  gateId: string;
  allowed: boolean;
  bypassed: boolean;
  unmet: ContentGateRequirementKind[];
  notice: string;
};

export type EditorDeliveryProjection = {
  document: EditorDocument;
  documentJson: string;
  gates: EditorContentGateDecision[];
};

/** Delivery projections may hide cargo; canonical documents never forget it. */
