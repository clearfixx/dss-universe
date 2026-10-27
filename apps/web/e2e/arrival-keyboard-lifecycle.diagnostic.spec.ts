/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Guest Arrival Diagnostic Tests
 * 📄 File: apps/web/e2e/arrival-keyboard-lifecycle.diagnostic.spec.ts
 * 🎯 Purpose: Tests the causal early-focus hypothesis independently of the smoke.
 * 🧠 Responsibilities: controls focus ordering and observes real CSS hit-testing.
 * 🏗️ Architecture: Browser-only diagnostic on unchanged runtime and CSS.
 * ⚠️ Important: Controlled scheduling is not proof of the original failure's cause.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { expect, test } from "@playwright/test";
import {
  installArrivalLifecycleDiagnostic,
  attachArrivalLifecycleDiagnostic,
} from "./helpers/arrival-lifecycle-diagnostic";

test("controlled early keyboard focus preserves cancellation hit-testing", async ({
  page,
}, info) => {
  await installArrivalLifecycleDiagnostic(page, true);
  try {
    await page.goto("/");
    const question = page.getByRole("button", { name: /React architecture/ });
    await expect(question).toBeFocused();
    await expect(page.locator("[data-arrival]")).toHaveAttribute(
      "data-arrival",
      "ready",
    );
    await page.keyboard.press("Enter");
    const cancel = page.getByRole("button", { name: "Cancel search" });
    await expect(cancel).toBeVisible();
    await cancel.scrollIntoViewIfNeeded();
    const hit = await cancel.evaluate((button) => {
      const rect = button.getBoundingClientRect();
      const target = document.elementFromPoint(
        rect.x + rect.width / 2,
        rect.y + rect.height / 2,
      );
      const consoleNode = document.querySelector(
        '[data-arrival-target="console"]',
      );
      return {
        receivesPointer: target !== null && button.contains(target),
        target: target?.getAttribute("aria-label"),
        arrival: document
          .querySelector("[data-arrival]")
          ?.getAttribute("data-arrival"),
        clipPath: consoleNode ? getComputedStyle(consoleNode).clipPath : null,
      };
    });
    await info.attach("controlled-cancel-hit", {
      body: JSON.stringify(hit),
      contentType: "application/json",
    });
    expect(hit.arrival).toBe("ready");
    expect(hit.receivesPointer).toBe(true);
    expect(hit.clipPath).toBe("none");
    await cancel.click();
    await expect(page.getByLabel("Explore a demo question")).toBeFocused();
  } finally {
    await attachArrivalLifecycleDiagnostic(page, info);
  }
});
