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
    page.getByRole("menu", { name: "Модулі DSS Universe" }),
  ).toBeVisible();
  const launcher = page.getByRole("menu", { name: "Модулі DSS Universe" });
  await expect(
    launcher.getByRole("menuitem", { name: "Новини" }),
  ).toHaveAttribute("href", "/news");
  await expect(
    launcher.getByRole("link", { name: "Адмінпанель" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("menu", { name: "Модулі DSS Universe" }).getByRole("menuitem", { name: "Academy" }),
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


test("anonymous visitors cannot open administrator Command Deck", async ({ page }) => {
  await page.goto("/command-deck");
  await expect(page).toHaveURL(/\/login\?returnTo=%2Fcommand-deck/);
  await expect(page.getByText("Панель адміністратора")).toHaveCount(0);
});

test("missing news articles return HTTP 404 without duplicate shells", async ({ page }) => {
  // The default Web smoke job starts Next.js only, not the GraphQL API.
  // Run this contract against a live API explicitly; an outage is not a 404.
  test.skip(process.env.DSS_WEB_E2E_LIVE_API !== "1", "Requires a running GraphQL API");
  const response = await page.goto("/news/uk/dss-e2e-missing-article-7e02a57f");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Сигнал не знайдено" })).toBeVisible();
  // The existing article not-found page is standalone, not an application shell.
  await expect(page.locator("[data-shell-variant]")).toHaveCount(0);
});


test("shell chrome opts into v1 without changing page content tokens", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/news");
  const shell = page.locator("[data-shell-variant]");
  const header = shell.locator("header").first();
  await expect(header).toHaveAttribute("data-dss-design", "v1");
  await expect(header).toHaveCSS("background-color", "rgb(17, 24, 39)");
  await expect(shell.locator("main")).not.toHaveAttribute("data-dss-design", "v1");
  expect(await shell.locator("main").evaluate((element) => element.closest('[data-dss-design="v1"]') === null)).toBe(true);
  await header.getByRole("button", { name: "Модулі" }).click();
  const menu = page.getByRole("menu", { name: "Модулі DSS Universe" });
  await expect(menu).toHaveAttribute("data-dss-design", "v1");
  await expect(menu).toHaveCSS("background-color", "rgb(26, 35, 50)");
});


test("news catalog uses scoped semantic filters without scoping the shell main", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/news");
  const filters = page.locator('form[action="/news"]');
  await expect(filters.getByRole("textbox", { name: "Пошук у новинах" })).toHaveAttribute("data-slot", "input");
  await expect(filters.getByRole("combobox", { name: "Формат новини" })).toHaveAttribute("data-slot", "native-select");
  expect(await filters.evaluate((element) => element.closest('[data-dss-design="v1"]') !== null)).toBe(true);
  await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 375);
});
