/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Browser Diagnostic Infrastructure
 * 📄 File: apps/web/e2e/helpers/arrival-lifecycle-diagnostic.ts
 * 🎯 Purpose: Records arrival lifecycle ordering without changing application behavior.
 * 🧠 Responsibilities: captures bounded focus, storage and arrival-state observations.
 * 🏗️ Architecture: Test-only probe, never imported by runtime.
 * ⚠️ Important: No forced interaction, timer changes or synthetic visibility delivery.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { Page, TestInfo } from "@playwright/test";

type DiagnosticWindow = Window & { __arrivalDiagnostic?: unknown[] };

export async function installArrivalLifecycleDiagnostic(page: Page) {
  await page.addInitScript(() => {
    const events: unknown[] = [];
    (window as DiagnosticWindow).__arrivalDiagnostic = events;
    const record = (event: string, detail?: unknown) => {
      if (events.length >= 200) return;
      events.push({
        event,
        time: performance.now(),
        arrival: document
          .querySelector("[data-arrival]")
          ?.getAttribute("data-arrival"),
        detail,
      });
    };
    document.addEventListener(
      "focusin",
      (event) => {
        const target = event.target;
        record(
          "focusin",
          target instanceof Element
            ? {
                tag: target.tagName,
                text: target.textContent?.trim().slice(0, 80),
              }
            : null,
        );
      },
      true,
    );
    const original = Storage.prototype.getItem;
    Storage.prototype.getItem = function (key: string) {
      const result = original.call(this, key);
      if (key === "dss:arrival:v1")
        record("arrival-storage-read", { seen: result === "seen" });
      return result;
    };
    new MutationObserver((records) => {
      for (const mutation of records) {
        if (
          mutation.type === "attributes" &&
          mutation.target instanceof Element &&
          mutation.target.hasAttribute("data-arrival")
        ) {
          record("arrival-mutation", {
            previous: mutation.oldValue,
            current: mutation.target.getAttribute("data-arrival"),
          });
        }
      }
    }).observe(document, {
      subtree: true,
      attributes: true,
      attributeFilter: ["data-arrival"],
      attributeOldValue: true,
    });
  });
}

export async function attachArrivalLifecycleDiagnostic(
  page: Page,
  info: TestInfo,
) {
  const evidence = await page.evaluate(() => {
    const button = Array.from(document.querySelectorAll("button")).find(
      (node) => node.textContent?.trim() === "Cancel search",
    );
    const rect = button?.getBoundingClientRect();
    const hit = rect
      ? document.elementFromPoint(
          rect.x + rect.width / 2,
          rect.y + rect.height / 2,
        )
      : null;
    const consoleNode = document.querySelector(
      '[data-arrival-target="console"]',
    );
    const style = consoleNode ? getComputedStyle(consoleNode) : null;
    return {
      events: (window as DiagnosticWindow).__arrivalDiagnostic,
      arrival: document
        .querySelector("[data-arrival]")
        ?.getAttribute("data-arrival"),
      cancelPresent: Boolean(button),
      hit: hit
        ? {
            tag: hit.tagName,
            label: hit.getAttribute("aria-label"),
            className: hit.className,
          }
        : null,
      console: style
        ? {
            animationName: style.animationName,
            clipPath: style.clipPath,
            transform: style.transform,
            pointerEvents: style.pointerEvents,
          }
        : null,
    };
  });
  await info.attach("arrival-lifecycle-diagnostic", {
    body: JSON.stringify(evidence, null, 2),
    contentType: "application/json",
  });
}
