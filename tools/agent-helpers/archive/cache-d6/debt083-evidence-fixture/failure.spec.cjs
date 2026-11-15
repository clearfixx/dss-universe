/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: DEBT-083 diagnostic fixture
 * 📄 File: node_modules/.cache/debt083-evidence-fixture/failure.spec.cjs
 * 🎯 Purpose:
 * Produce one intentional synthetic failure to verify diagnostics.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
const { createRequire } = require('node:module');
const { join } = require('node:path');
const web = createRequire(join(process.cwd(), 'apps/web/package.json'));
const { test, expect } = web('@playwright/test');
test('intentional evidence failure, not an application regression', async ({ page }) => {
  await page.setContent('<main>DEBT-083 synthetic diagnostic fixture</main>');
  expect('synthetic actual').toBe('intentional expected mismatch');
});
