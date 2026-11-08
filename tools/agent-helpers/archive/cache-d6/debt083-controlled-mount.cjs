/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: DEBT-083 controlled browser research
 * 📄 File: node_modules/.cache/debt083-controlled-mount.cjs
 * 🎯 Purpose:
 * Test the cleanup hypothesis by injecting one programmatic early React click.
 * 🧠 Responsibilities:
 * • observe native timer scheduling and clearing;
 * • distinguish controlled scheduling from ordinary user reproduction;
 * • persist observations regardless of the expected answer outcome.
 * 🏗️ Architecture:
 * Ignored browser diagnostic; no application source changes.
 * ⚠️ Important:
 * This injected schedule does not establish the original CI failure cause.
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
 const result = { controlled: true, errors: [] };
 page.on('pageerror', error => result.errors.push(error.message));
 await page.addInitScript(() => {
  const events = window.__controlled083 = [];
  const note = (kind, details = {}) => events.push({ kind, at: performance.now(), ...details });
  const nativeSet = window.setTimeout;
  const nativeClear = window.clearTimeout;
  const tracked = new Set();
  window.setTimeout = function(callback, delay, ...args) {
   if (delay !== 550 || typeof callback !== 'function') return nativeSet.call(this, callback, delay, ...args);
   let id;
   id = nativeSet.call(this, (...values) => { note('fire', {id}); return callback(...values); }, delay, ...args);
   tracked.add(id); note('schedule', {id}); return id;
  };
  window.clearTimeout = function(id) {
   if (tracked.has(id)) note('clear', {id, stack: new Error().stack});
   return nativeClear.call(this, id);
  };
  const nativeAdd = window.addEventListener;
  let injected = false;
  window.addEventListener = function(type, listener, options) {
   const returned = nativeAdd.call(this, type, listener, options);
   const stack = type === 'resize' ? new Error().stack : '';
   if (!injected && type === 'resize' && stack?.includes('UniverseArrival')) {
    const button = [...document.querySelectorAll('button')].find(node => /React architecture/.test(node.textContent));
    if (button) { injected = true; note('programmatic-early-click', {stack}); button.click(); }
   }
   return returned;
  };
 });
 try {
  result.httpStatus = (await page.goto('http://127.0.0.1:3100/')).status();
  await expect(page.getByText('Exploring the Universe…')).toBeVisible({timeout:5000});
  try {
   await expect(page.getByText(/Organize the application by product feature/)).toBeVisible({timeout:5000});
   result.answer = 'visible';
  } catch (error) { result.answer = 'absent-at-5000ms'; result.failure = error.message; }
 } catch (error) { result.setupFailure = error.message; process.exitCode = 1; }
 finally {
  result.events = await page.evaluate(() => window.__controlled083);
  await page.screenshot({path:'node_modules/.cache/debt083-controlled-mount.png'});
  writeFileSync('node_modules/.cache/debt083-controlled-mount.json', JSON.stringify(result,null,2));
  console.log(JSON.stringify(result));
  await browser.close();
 }
})().catch(error => { console.error(error); process.exitCode = 1; });
