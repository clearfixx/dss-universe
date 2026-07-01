/**
 * ===============================================================
 * DSS Universe
 * ---------------------------------------------------------------
 * 🛰️ Layer: Core
 * File: index.ts
 *
 * Purpose:
 * Public API for the Core layer.
 *
 * Responsibilities:
 * • exports application-wide infrastructure modules;
 * • exposes stable technical building blocks;
 * • keeps feature modules away from direct internal core paths.
 *
 * 🧭 Architecture:
 * Core contains framework integrations, technical services,
 * infrastructure modules, and cross-cutting platform concerns.
 *
 * ⚠️ Important:
 * Core must never contain business feature logic.
 * Public exports are contracts. Treat them like airlocks. 🚪
 *
 * Build. Share. Grow.
 * ===============================================================
 */

export * from './auth';
export * from './authorization';
export * from './config';
export * from './database';
