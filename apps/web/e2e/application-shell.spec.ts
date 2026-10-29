import { expect, test } from "@playwright/test";

test("public content Shell exposes only implemented navigation and a working launcher", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/news");

  await expect(page.locator('[data-shell-variant="MODULE_LAUNCHER"]')).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Навігаційний шлях" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Модулі/ }).click();
  await expect(
    page.getByRole("navigation", { name: "Модулі DSS Universe" }),
  ).toBeVisible();
  const launcher = page.getByRole("navigation", { name: "Модулі DSS Universe" });
  await expect(
    launcher.getByRole("link", { name: "Новини" }),
  ).toHaveAttribute("href", "/news");
  await expect(
    launcher.getByRole("link", { name: "Mission Control" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("navigation", { name: "Модулі DSS Universe" }).getByRole("link", { name: "Academy" }),
  ).toHaveCount(0);
});

test("mobile Shell remains keyboard-accessible and closes its drawer", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/news");

  await expect(
    page.getByRole("button", { name: "Відкрити навігацію" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Відкрити навігацію" }).click();
  await expect(
    page.getByRole("navigation", { name: "Модулі DSS Universe" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("navigation", { name: "Модулі DSS Universe" }),
  ).not.toBeVisible();
  await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 375);
});
