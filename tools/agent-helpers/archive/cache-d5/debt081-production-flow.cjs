/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: DEBT-081 verification
 * 📄 File: node_modules/.cache/debt081-production-flow.cjs
 *
 * 🎯 Purpose:
 * Observes one real production React demo flow in a fresh guest context.
 *
 * 🧠 Responsibilities:
 * • retains build identity, HTTP, browser errors, screenshots and trace;
 * • verifies search, cancel, restart and exact prewritten response;
 * • leaves application source, timers, services and backend data untouched.
 *
 * 🏗️ Architecture:
 * Ignored browser diagnostic, not production code or retry machinery.
 *
 * ⚠️ Important:
 * Passing this observation does not prove absence of a timing race.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
const { createRequire } = require('node:module');
const { readFileSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');
const web = createRequire(join(process.cwd(), 'apps/web/package.json'));
const { chromium, expect } = web('@playwright/test');
const label = process.argv[2];
if (!['baseline', 'corrected'].includes(label)) throw Error('Expected observation label.');
const base = join(process.cwd(), `node_modules/.cache/debt081-production-${label}`);

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  const report = {
    label, buildId: readFileSync('apps/web/.next/BUILD_ID', 'utf8').trim(),
    sourceHead: require('node:child_process').execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    status: 'running', pageErrors: [], consoleErrors: [], dataRequests: [], steps: [],
  };
  page.on('pageerror', e => report.pageErrors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') report.consoleErrors.push(m.text()); });
  page.on('request', r => {
    if (['fetch', 'xhr'].includes(r.resourceType())) report.dataRequests.push(new URL(r.url()).pathname);
  });
  await context.tracing.start({ screenshots: true, snapshots: true });
  const step = name => report.steps.push({ name, at: Date.now() });
  try {
    const response = await page.goto('http://127.0.0.1:3102/', { waitUntil: 'commit' });
    report.httpStatus = response.status();
    if (report.httpStatus !== 200) throw Error('Unexpected page status.');
    await page.getByRole('button', { name: /React architecture/ }).click();
    step('early React click');
    await expect(page.getByText('Exploring the Universe…')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Organize the application by product feature/)).toBeVisible({ timeout: 5000 });
    step('exact React answer');
    await page.getByRole('button', { name: 'Explore another question' }).click();
    await expect(page.getByLabel('Explore a demo question')).toHaveValue('');
    await expect(page.getByRole('button', { name: 'Search demo' })).toBeDisabled();
    await page.getByRole('button', { name: /React architecture/ }).click();
    await expect(page.getByText('Exploring the Universe…')).toBeVisible();
    await page.getByRole('button', { name: 'Cancel search' }).click();
    await expect(page.getByText('Exploring the Universe…')).toHaveCount(0);
    step('cancelled');
    await page.getByRole('button', { name: /React architecture/ }).click();
    await expect(page.getByText(/Organize the application by product feature/)).toBeVisible({ timeout: 5000 });
    step('exact restarted answer');
    if (report.pageErrors.length || report.consoleErrors.length) throw Error('Browser errors observed.');
    report.status = 'passed';
  } catch (error) {
    report.status = 'failed'; report.failure = error.message; process.exitCode = 1;
  } finally {
    await page.screenshot({ path: base + '.png' });
    await context.tracing.stop({ path: base + '-trace.zip' });
    writeFileSync(base + '.json', JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report));
    await context.close(); await browser.close();
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
