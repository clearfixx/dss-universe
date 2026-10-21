/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Core Events
 * 📄 File: apps/api/src/core/events/types/json-value.type.ts
 *
 * 🎯 Purpose:
 * Defines transport-safe JSON values without coupling event contracts to Prisma.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export type JsonPrimitive = boolean | number | string | null;

export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };
