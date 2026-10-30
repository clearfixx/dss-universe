/**
 * ===============================================================
 * DSS Universe
 * Module: DEBT-081 research (ignored diagnostic, not application code)
 * File: node_modules/.cache/debt081-production-probe.cjs
 * Purpose: Observe earliest actionable Academy click in a production build.
 * Responsibilities: Two fresh-context observations; retain timer/network evidence.
 * Architecture: Browser-only research; no API, DB, or source mutation.
 * Important: Passing observations do not prove absence of a timing race.
 * ===============================================================
 */
const { createRequire } = require('node:module');
const { join } = require('node:path');
const { writeFileSync } = require('node:fs');
const web = createRequire(join(process.cwd(), 'apps/web/package.json'));
const { chromium, expect } = web('@playwright/test');

(async () => {
  const browser = await chromium.launch();
  const results = [];
  try {
    for (const instrumented of [false, true]) {
      const context = await browser.newContext({ reducedMotion: 'reduce' });
      const page = await context.newPage();
      const errors = [];
      const dataRequests = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => {
        if (message.type() === 'error') errors.push(message.text());
      });
      page.on('request', request => {
        if (['fetch', 'xhr'].includes(request.resourceType()))
          dataRequests.push(new URL(request.url()).pathname);
      });
      if (instrumented) await page.addInitScript(() => {
        const originalSet = window.setTimeout;
        const originalClear = window.clearTimeout;
        const tracked = new Set();
        window.__debt081 = [];
        window.setTimeout = function(callback, delay, ...args) {
          if (delay !== 550 || typeof callback !== 'function')
            return originalSet.call(this, callback, delay, ...args);
          let id;
          id = originalSet.call(this, (...values) => {
            window.__debt081.push({ kind: 'fire', id, at: performance.now() });
            return callback(...values);
          }, delay, ...args);
          tracked.add(id);
          window.__debt081.push({ kind: 'schedule', id, at: performance.now() });
          return id;
        };
        window.clearTimeout = function(id) {
          if (tracked.has(id)) window.__debt081.push({
            kind: 'clear', id, at: performance.now(), stack: new Error().stack,
          });
          return originalClear.call(this, id);
        };
      });
      const result = { instrumented, status: 'running' };
      results.push(result);
      try {
        const response = await page.goto('http://127.0.0.1:3101/', { waitUntil: 'commit' });
        result.httpStatus = response.status();
        await page.getByRole('button', { name: 'Explore Academy demo' }).click();
        result.afterClick = await page.evaluate(() => ({
          at: performance.now(), readyState: document.readyState,
          arrival: document.querySelector('[data-arrival]')?.getAttribute('data-arrival'),
        }));
        await expect(page.getByText(/Begin with inference/)).toBeVisible({ timeout: 5000 });
        await page.getByRole('button', { name: 'Academy', exact: true }).click();
        await expect(page.getByRole('heading', {
          name: 'Your first strict TypeScript project',
        })).toBeVisible({ timeout: 5000 });
        await expect(page.getByText('Demo content — not a published resource.')).toBeVisible();
        if (errors.length) throw new Error('Browser errors: ' + errors.join('; '));
        result.status = 'passed';
      } catch (error) {
        result.status = 'failed';
        result.failure = error.message;
        throw error;
      } finally {
        result.errors = errors;
        result.dataRequests = dataRequests;
        result.timers = instrumented ? await page.evaluate(() => window.__debt081) : null;
        await page.screenshot({ path: join(process.cwd(),
          `node_modules/.cache/debt081-production-${instrumented ? 'traced' : 'plain'}.png`) });
        await context.close();
      }
    }
  } finally {
    writeFileSync(join(process.cwd(), 'node_modules/.cache/debt081-production-results.json'),
      JSON.stringify(results, null, 2));
    console.log(JSON.stringify(results));
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
