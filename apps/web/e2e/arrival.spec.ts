import { expect, test } from "@playwright/test";

test("arrival only consumes visible time before marking the first visit seen", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/");
  const scene = page.locator("[data-arrival]");
  await expect(scene).toHaveAttribute("data-arrival", "playing");
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.clock.fastForward(10000);
  await expect(scene).toHaveAttribute("data-arrival-paused", "true");
  expect(
    await page.evaluate(() => localStorage.getItem("dss:arrival:v1")),
  ).toBeNull();
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.clock.fastForward(3100);
  await expect(scene).toHaveAttribute("data-arrival", "ready");
  expect(
    await page.evaluate(() => localStorage.getItem("dss:arrival:v1")),
  ).toBe("seen");
});

test("keyboard interaction reveals the interface and search returns focus", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: /DSS UNIVERSE/ }).focus();
  await expect(page.locator("[data-arrival]")).toHaveAttribute(
    "data-arrival",
    "ready",
  );
  await page.getByRole("button", { name: /React architecture/ }).click();
  await page.getByRole("button", { name: "Cancel search" }).click();
  await expect(page.getByLabel("Explore a demo question")).toBeFocused();
  await page.getByRole("button", { name: /React architecture/ }).click();
  await page.getByRole("button", { name: "Explore another question" }).click();
  await expect(page.getByLabel("Explore a demo question")).toBeFocused();
});

test("the guest page remains usable without JavaScript", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:3100/");
  await expect(
    page.getByRole("heading", { name: /DSS Universe/ }),
  ).toBeVisible();
  await expect(
    page.getByText(/Enable JavaScript for the animated Core/),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Search demo" }),
  ).not.toBeVisible();
  await expect(
    page.getByRole("link", { name: "Enter Station" }).first(),
  ).toBeVisible();
  await context.close();
});

test("Core module opens a demo and source previews remain topic-specific", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: "Explore Academy demo" }).click();
  await expect(page.getByText(/Begin with inference/)).toBeVisible();
  const source = page.getByRole("button", { name: "Academy", exact: true });
  await source.click();
  await expect(source).toHaveAttribute("aria-expanded", "true");
  await expect(
    page.getByRole("heading", { name: "Your first strict TypeScript project" }),
  ).toBeVisible();
  await expect(
    page.getByText("Demo content — not a published resource."),
  ).toBeVisible();
  await source.press("Enter");
  await expect(source).toHaveAttribute("aria-expanded", "false");
  await page.getByRole("button", { name: "Explore another question" }).click();
  await page.getByRole("button", { name: /React architecture/ }).click();
  await expect(
    page.getByText(/Organize the application by product feature/),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Your first strict TypeScript project" }),
  ).not.toBeVisible();
  await page
    .getByRole("button", { name: "Knowledge Forge", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "A feature-first React project" }),
  ).toBeVisible();
});

test("Core module controls stay within a narrow viewport", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  for (const moduleName of [
    "Knowledge Forge",
    "Research Lab",
    "Community Hub",
    "Academy",
  ]) {
    const box = await page
      .getByRole("button", { name: `Explore ${moduleName} demo` })
      .boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(320);
  }
});

test("demo activity can be paused and resumed", async ({ page }) => {
  await page.clock.install();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const pause = page.getByRole("button", { name: "Pause ambient activity" });
  await expect(pause).toBeVisible();
  await expect(
    page.getByText("A new idea becomes shared knowledge."),
  ).toBeVisible();
  await page.clock.fastForward(7000);
  await expect(
    page.getByText("Alex shared a guide to React architecture."),
  ).toBeVisible();
  await pause.click();
  await page.clock.fastForward(20000);
  await expect(
    page.getByText("Alex shared a guide to React architecture."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Resume ambient activity" }).click();
  // Let the browser deliver the new IntersectionObserver subscription before advancing time.
  await page.waitForTimeout(100);
  await page.clock.fastForward(7000);
  await expect(
    page.getByText("Maria helped a developer find their next step."),
  ).toBeVisible();
});

test("unsupported requests do not fabricate answers and cancelled searches stay cancelled", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByLabel("Explore a demo question").fill("What is the weather?");
  await page.getByRole("button", { name: "Search demo" }).click();
  await expect(
    page.getByText(/This preview has three prepared examples/),
  ).toBeVisible();
  await expect(
    page.getByText(/Start with short-lived access tokens/),
  ).not.toBeVisible();
  await page.getByRole("button", { name: /React architecture/ }).click();
  await page.getByRole("button", { name: "Cancel search" }).click();
  await page.waitForTimeout(2400);
  await expect(
    page.getByText(/Organize the application by product feature/),
  ).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: /React architecture/ }),
  ).toBeVisible();
});

test("first arrival finishes, replay can be skipped, returning visits stay ready", async ({
  page,
}) => {
  await page.goto("/");
  const scene = page.locator("[data-arrival]");
  await expect(scene).toHaveAttribute("data-arrival", "ready", {
    timeout: 6000,
  });
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("dss:arrival:v1")))
    .toBe("seen");
  const copy = page
    .getByRole("heading", { name: /DSS Universe/ })
    .locator("..");
  await expect(copy).toHaveCSS("opacity", "1");
  await expect(copy).toHaveCSS("clip-path", "none");
  await page.getByRole("button", { name: "Replay arrival" }).click();
  await expect(scene).toHaveAttribute("data-arrival", "playing");
  await page.keyboard.press("Escape");
  await expect(scene).toHaveAttribute("data-arrival", "ready");
  await page.getByRole("button", { name: "Replay arrival" }).click();
  await page.getByRole("button", { name: "Skip arrival" }).click();
  await expect(scene).toHaveAttribute("data-arrival", "ready");
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Replay arrival" }),
  ).toBeVisible();
  await expect(scene).toHaveAttribute("data-arrival", "ready");
});

test("demo search completes locally and can start again", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: /React architecture/ }).click();
  await expect(page.getByText("Exploring the Universe…")).toBeVisible();
  await expect(
    page.getByText(/Organize the application by product feature/),
  ).toBeVisible();
  await page.getByRole("button", { name: "Explore another question" }).click();
  await expect(page.getByLabel("Explore a demo question")).toHaveValue("");
  await expect(
    page.getByRole("button", { name: "Search demo" }),
  ).toBeDisabled();
  expect(errors).toEqual([]);
});

test("reduced motion and unavailable storage still allow mobile interaction", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new Error("Storage unavailable");
    };
    Storage.prototype.setItem = () => {
      throw new Error("Storage unavailable");
    };
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Replay arrival" }).click();
  await expect(page.locator("[data-arrival]")).toHaveAttribute(
    "data-arrival",
    "ready",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: /Learn TypeScript/ }).click();
  await expect(page.getByText(/Begin with inference/)).toBeVisible();
});
