import { expect, test } from "./probe-fixture";

test("guest foundation page renders", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /Explore/ })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Sign in" }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Sign in" }).first(),
  ).toHaveAttribute("href", "/login");
});

test("authenticated application shell renders", async ({ page }) => {
  await page.goto("/command-deck");

  await expect(page.getByRole("heading", { name: /Welcome/ })).toBeVisible();
  await expect(page.getByRole("navigation")).toBeVisible();
});
