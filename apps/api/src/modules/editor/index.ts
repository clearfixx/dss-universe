/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: DSS Editor Platform
 * 📄 File: apps/api/src/modules/editor/index.ts
 *
 * 🎯 Purpose:
 * Exposes the public server-side DSS Editor module and service boundary.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export * from './application/services/editor-content-delivery.service';
export * from './application/services/editor.service';
export * from './application/types/editor-delivery.type';
export * from './editor.module';

/** Consumers request projections; they do not invent document schemas. */
