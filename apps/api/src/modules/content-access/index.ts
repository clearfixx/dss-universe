/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Content Access
 * 📄 File: apps/api/src/modules/content-access/index.ts
 *
 * 🎯 Purpose:
 * Exposes the public Content Access module and evaluation service boundary.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export * from './content-access.module';
export * from './application/services/content-gates.service';

/** One public hatch keeps gate internals out of neighboring modules. */
