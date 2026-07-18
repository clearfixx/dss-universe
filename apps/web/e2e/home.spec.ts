import { expect, test } from "@playwright/test";

test("guest foundation page renders", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /Explore/ })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Enter Station" }),
  ).toBeVisible();
});

test("authenticated application shell renders", async ({ page }) => {
  await page.goto("/command-deck");

  await expect(page.getByRole("heading", { name: /Welcome/ })).toBeVisible();
  await expect(page.getByRole("navigation")).toBeVisible();
});
