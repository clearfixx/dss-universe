/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Test Infrastructure
 * 📄 File: apps/web/vitest.setup.ts
 * 🎯 Purpose: Releases React roots before Vitest disposes each jsdom environment.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import "@testing-library/jest-dom/vitest";
import { act, cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Vitest globals are disabled, so Testing Library cannot register auto-cleanup.
afterEach(async () => {
  await act(async () => {
    cleanup();
  });
});
