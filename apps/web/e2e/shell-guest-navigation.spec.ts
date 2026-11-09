import { expect, test } from "@playwright/test";

test("guest mobile shell exposes public modules and closes its drawer after navigation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/news");

  const trigger = page.getByRole("button", { name: "Відкрити навігацію" });
  await expect(trigger).toBeVisible();
  await trigger.click();

  const drawer = page.getByRole("dialog", { name: "Навігація DSS Universe" });
  await expect(drawer).toBeVisible();

  const modules = drawer.getByRole("navigation", { name: "Модулі DSS Universe" });
  await expect(modules.getByRole("link", { name: "Новини" })).toBeVisible();
  for (const label of ["Адмінпанель", "Newsroom", "Учасники", "Медіатека", "Налаштування"]) {
    await expect(modules.getByRole("link", { name: label })).toHaveCount(0);
  }

  await modules.getByRole("link", { name: "Новини" }).click();
  await expect(drawer).not.toBeVisible();
  await expect(page).toHaveURL(/\/news$/);
});

test("mobile drawer closes on client-side history changes and stays closed after Back", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/news");

  const trigger = page.getByRole("button", { name: "Відкрити навігацію" });
  const drawer = page.getByRole("dialog", { name: "Навігація DSS Universe" });

  await trigger.click();
  await expect(drawer).toBeVisible();

  // Next.js integrates native history changes with usePathname. A history
  // transition bypasses the onClick callbacks inside the mobile drawer.
  await page.evaluate(() => window.history.pushState({}, "", "/news/preview"));
  await expect(page).toHaveURL(/\/news\/preview$/);
  await expect(drawer).not.toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL(/\/news$/);
  await expect(drawer).not.toBeVisible();

  // Navigating did not permanently disable opening the drawer.
  await trigger.click();
  await expect(drawer).toBeVisible();
});

test("guest shell header fits narrow phones without hiding navigation or sign-in", async ({ page }) => {
  await page.goto("/news");

  for (const width of [320, 375]) {
    await page.setViewportSize({ width, height: 760 });

    const header = page.locator("header").first();
    await expect(header).toBeVisible();
    await expect(page.getByRole("link", { name: "DSS Universe — головна" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Відкрити навігацію" })).toBeVisible();
    await expect(header.getByRole("link", { name: "Увійти" })).toBeVisible();

    const dimensions = await header.evaluate((element) => ({
      scrollWidth: element.scrollWidth,
      clientWidth: element.clientWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
  }
});

test("mobile navigation exposes expanded state and closes with Escape", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/news");

  // Modal dialogs make background controls inaccessible to role queries while
  // open; inspect this specific trigger's DOM state across the transition.
  const trigger = page.locator('header button[aria-label="Відкрити навігацію"]');
  const drawer = page.getByRole("dialog", { name: "Навігація DSS Universe" });

  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await trigger.click();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(drawer).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(drawer).not.toBeVisible();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");

  await trigger.click();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(drawer).toBeVisible();
});
