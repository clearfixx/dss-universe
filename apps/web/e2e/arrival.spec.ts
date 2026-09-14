import { expect, test } from "@playwright/test";

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
  await page.getByRole("button", { name: "Replay arrival" }).click();
  await expect(scene).toHaveAttribute("data-arrival", "playing");
  await page.keyboard.press("Escape");
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
