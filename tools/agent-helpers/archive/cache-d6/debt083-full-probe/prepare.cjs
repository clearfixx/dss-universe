/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: DEBT-083 browser research
 * 📄 File: node_modules/.cache/debt083-full-probe/prepare.cjs
 * 🎯 Purpose:
 * Generate diagnostic copies by changing imports only, never source assertions.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
const { readFileSync, writeFileSync, mkdirSync } = require('node:fs');
const { join } = require('node:path');
const output = join(process.cwd(), 'test-results/debt083-full-probe');
mkdirSync(output, { recursive: true });
for (const name of ['probe-fixture.ts', 'playwright.config.cjs']) {
  const source = readFileSync(join(__dirname, name), 'utf8');
  writeFileSync(join(output, name), source.replaceAll('../../../apps/', '../../apps/')
    .replace("'../../..'", "'../..'"));
}
for (const name of ['arrival.spec.ts', 'home.spec.ts']) {
  const original = readFileSync(join(process.cwd(), 'apps/web/e2e', name), 'utf8');
  const copied = original.replace('from "@playwright/test"', 'from "./probe-fixture"')
    .replace('from "./helpers/station-demo-readiness"', 'from "../../apps/web/e2e/helpers/station-demo-readiness"');
  if (copied === original) throw new Error('Missing fixture import replacement');
  writeFileSync(join(output, name), copied);
}
