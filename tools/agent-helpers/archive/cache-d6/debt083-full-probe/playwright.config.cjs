/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: DEBT-083 browser research
 * 📄 File: node_modules/.cache/debt083-full-probe/playwright.config.cjs
 * 🎯 Purpose:
 * Run an isolated instrumented copy using the actual smoke configuration.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
const base = require('../../../apps/web/playwright.config.ts').default;
module.exports = { ...base, testDir: __dirname,
  testMatch: '*.spec.ts', outputDir: './results',
  webServer: { ...base.webServer, command: 'pnpm --filter @dss/web dev --port 3100',
    cwd: require('node:path').resolve(__dirname, '../../..'), reuseExistingServer: false } };
