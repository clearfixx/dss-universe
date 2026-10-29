/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: DEBT-083 diagnostic fixture
 * 📄 File: node_modules/.cache/debt083-evidence-fixture/playwright.config.cjs
 * 🎯 Purpose:
 * Exercise real failure recording without an application server.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
const base = require('../../../apps/web/playwright.config.ts').default;
module.exports = { ...base, testDir: __dirname, testMatch: 'failure.spec.cjs',
  webServer: undefined, workers: 1, reporter: 'list', outputDir: './results' };
