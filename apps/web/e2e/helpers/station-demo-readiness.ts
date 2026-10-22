/**
 * DSS Universe — Browser Test Infrastructure
 * File: apps/web/e2e/helpers/station-demo-readiness.ts
 * Purpose: Observe native visibility delivery without inventing visible entries.
 * Important: Test-only delivery gate; never imported by application code.
 */
import { expect, type Page } from "@playwright/test";

type ObserverProbe = {
  hold: boolean;
  pending: Array<() => void>;
  visibleDeliveries: number;
};
type ProbeWindow = typeof window & { __dssStationObserver: ObserverProbe };

export async function installStationObserverProbe(page: Page, hold = false) {
  await page.addInitScript((holdDelivery) => {
    const state: ObserverProbe = {
      hold: holdDelivery,
      pending: [],
      visibleDeliveries: 0,
    };
    (window as ProbeWindow).__dssStationObserver = state;
    const NativeObserver = window.IntersectionObserver;
    const disconnected = new WeakSet<IntersectionObserver>();
    window.IntersectionObserver = class extends NativeObserver {
      constructor(
        callback: IntersectionObserverCallback,
        options?: IntersectionObserverInit,
      ) {
        super((entries, observer) => {
          const stationVisible = entries.some(
            (entry) =>
              entry.target.hasAttribute("data-arrival") && entry.isIntersecting,
          );
          const deliver = () => {
            if (disconnected.has(observer)) return;
            callback.call(observer, entries, observer);
            if (stationVisible) state.visibleDeliveries++;
          };
          if (stationVisible && state.hold) state.pending.push(deliver);
          else deliver();
        }, options);
      }
      disconnect() {
        disconnected.add(this);
        super.disconnect();
      }
      observe(target: Element) {
        disconnected.delete(this);
        super.observe(target);
      }
    };
  }, hold);
}

export async function waitForStationDemoReadiness(page: Page, after = 0) {
  await expect(page.locator("[data-arrival]")).toHaveAttribute(
    "data-arrival",
    "ready",
  );
  await expect.poll(() => page.evaluate(() => document.hidden)).toBe(false);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as ProbeWindow).__dssStationObserver.visibleDeliveries,
      ),
    )
    .toBeGreaterThan(after);
  return page.evaluate(
    () => (window as ProbeWindow).__dssStationObserver.visibleDeliveries,
  );
}

export async function waitForHeldStationObserver(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as ProbeWindow).__dssStationObserver.pending.length,
      ),
    )
    .toBeGreaterThan(0);
}

export async function releaseStationObserver(page: Page) {
  await page.evaluate(() => {
    const state = (window as ProbeWindow).__dssStationObserver;
    state.hold = false;
    for (const deliver of state.pending.splice(0)) deliver();
  });
}
