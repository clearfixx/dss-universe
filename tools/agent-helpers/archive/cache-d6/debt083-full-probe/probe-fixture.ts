/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: DEBT-083 browser research
 * 📄 File: node_modules/.cache/debt083-full-probe/probe-fixture.ts
 *
 * 🎯 Purpose:
 * Retain real timer cancellation evidence from one instrumented smoke attempt.
 *
 * 🧠 Responsibilities:
 * • observe native timers and visibility delivery without changing delays;
 * • attach event evidence on either success or failure;
 * • leave the original suite and application untouched.
 *
 * 🏗️ Architecture:
 * Ignored diagnostic fixture wrapping only the React demo scenario.
 *
 * ⚠️ Important:
 * Instrumentation may alter timing; it is not a synchronization correction.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { test as base, expect } from "../../../apps/web/node_modules/@playwright/test";

export { expect };
export const test = base.extend({
  page: async ({ page }, use, testInfo) => {
    const observed = testInfo.title === "demo search completes locally and can start again";
    if (observed) await page.addInitScript(() => {
      const events = (window as any).__debt083 = [];
      const note = (kind: string, details = {}) => {
        if (events.length >= 256) return;
        events.push({ kind, at: performance.now(), hidden: document.hidden,
          arrival: document.querySelector<HTMLElement>('[data-arrival]')?.dataset.arrival,
          ...details });
      };
      const nativeSet = window.setTimeout;
      const nativeClear = window.clearTimeout;
      const tracked = new Set<number>();
      window.setTimeout = function(callback: any, delay: number, ...args: any[]) {
        if (delay !== 550 || typeof callback !== 'function')
          return nativeSet.call(this, callback, delay, ...args);
        let id: number;
        id = nativeSet.call(this, (...values: any[]) => {
          note('fire', { id }); return callback(...values);
        }, delay, ...args);
        tracked.add(id); note('schedule', { id }); return id;
      };
      window.clearTimeout = function(id: number) {
        if (tracked.has(id)) note('clear', { id, stack: new Error().stack });
        return nativeClear.call(this, id);
      };
      const NativeObserver = window.IntersectionObserver;
      window.IntersectionObserver = class extends NativeObserver {
        constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
          super((entries, observer) => {
            if (entries.some(entry => entry.target.hasAttribute('data-arrival')))
              note('observer-delivery', { visible: entries.some(entry => entry.target.hasAttribute('data-arrival') && entry.isIntersecting) });
            callback.call(observer, entries, observer);
          }, options);
          note('observer-create');
        }
        disconnect() { note('observer-disconnect'); return super.disconnect(); }
      };
    });
    try { await use(page); }
    finally {
      if (observed && !page.isClosed()) await testInfo.attach('native-timer-events', {
        body: JSON.stringify(await page.evaluate(() => (window as any).__debt083), null, 2),
        contentType: 'application/json',
      });
    }
  },
});
