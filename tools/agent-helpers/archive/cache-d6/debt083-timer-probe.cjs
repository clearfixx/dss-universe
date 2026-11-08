/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: DEBT-083 browser diagnostics
 * 📄 File: node_modules/.cache/debt083-timer-probe.cjs
 *
 * 🎯 Purpose:
 * Retain timer and native observer evidence for one early React demo click.
 *
 * 🧠 Responsibilities:
 * • observe real timer scheduling, firing and cancellation;
 * • preserve searching, answer, restart and page-error assertions;
 * • retain failures without retrying the scenario.
 *
 * 🏗️ Architecture:
 * Ignored browser-only research harness; never imported by the application.
 *
 * ⚠️ Important:
 * Instrumentation can perturb timing. One pass cannot disprove a race.
 *
 * 💡 Notes:
 * A green observation is evidence, not a time machine for a red CI run.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
const { createRequire } = require('node:module');
const { join } = require('node:path');
const { writeFileSync } = require('node:fs');
const web = createRequire(join(process.cwd(), 'apps/web/package.json'));
const { chromium, expect } = web('@playwright/test');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ reducedMotion: 'reduce' });
  const result = { status: 'running', errors: [], dataRequests: [] };
  page.on('pageerror', error => result.errors.push(error.message));
  page.on('request', request => {
    if (['fetch', 'xhr'].includes(request.resourceType()))
      result.dataRequests.push(new URL(request.url()).pathname);
  });
  await page.addInitScript(() => {
    const events = window.__debt083 = [];
    const nativeSet = window.setTimeout;
    const nativeClear = window.clearTimeout;
    const tracked = new Set();
    const note = (kind, details = {}) => events.push({
      kind, at: performance.now(), hidden: document.hidden,
      arrival: document.querySelector('[data-arrival]')?.dataset.arrival,
      ...details,
    });
    window.setTimeout = function(callback, delay, ...args) {
      if (delay !== 550 || typeof callback !== 'function')
        return nativeSet.call(this, callback, delay, ...args);
      let id;
      id = nativeSet.call(this, (...values) => {
        note('fire', { id });
        return callback(...values);
      }, delay, ...args);
      tracked.add(id);
      note('schedule', { id });
      return id;
    };
    window.clearTimeout = function(id) {
      if (tracked.has(id)) note('clear', { id, stack: new Error().stack });
      return nativeClear.call(this, id);
    };
    const NativeObserver = window.IntersectionObserver;
    window.IntersectionObserver = class extends NativeObserver {
      constructor(callback, options) {
        super((entries, observer) => {
          if (entries.some(entry => entry.target.hasAttribute('data-arrival')))
            note('native-observer', {
              visible: entries.some(entry => entry.target.hasAttribute('data-arrival') && entry.isIntersecting),
            });
          callback.call(observer, entries, observer);
        }, options);
      }
      disconnect() { note('observer-disconnect'); return super.disconnect(); }
    };
  });
  try {
    result.httpStatus = (await page.goto('http://127.0.0.1:3100/')).status();
    await page.getByRole('button', { name: /React architecture/ }).click();
    await expect(page.getByText('Exploring the Universe…')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Organize the application by product feature/)).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: 'Explore another question' }).click();
    await expect(page.getByLabel('Explore a demo question')).toHaveValue('');
    await expect(page.getByRole('button', { name: 'Search demo' })).toBeDisabled();
    expect(result.errors).toEqual([]);
    result.status = 'passed';
  } catch (error) {
    result.status = 'failed';
    result.failure = error.message;
    process.exitCode = 1;
  } finally {
    result.events = await page.evaluate(() => window.__debt083);
    await page.screenshot({ path: 'node_modules/.cache/debt083-timer-probe.png' });
    writeFileSync('node_modules/.cache/debt083-timer-probe.json', JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result));
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
