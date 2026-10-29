/** DSS File Passport — source/build startup evidence; no successful Worker or delivery claim. */
const { resolve } = require('node:path');
const { spawnSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const { existsSync, readFileSync, writeFileSync } = require('node:fs');
const assert = require('node:assert/strict');

const root = resolve(__dirname, '../../..');
const reportPath = resolve(__dirname, 'verified-network-report.json');
assert.equal(existsSync(resolve(__dirname, '.env')), false);
const allowed = new Set(['path', 'systemroot', 'windir', 'comspec', 'temp', 'tmp']);
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => allowed.has(key.toLowerCase())));
Object.assign(env, { NODE_ENV: 'test', DSS_DIAGNOSTIC_REPORT: reportPath });
const result = spawnSync(process.execPath, [
  '--import', pathToFileURL(resolve(__dirname, 'network-guard.mjs')).href,
  '--env-file-if-exists=.env', resolve(root, 'apps/worker/dist/main.js'),
], { cwd: __dirname, env, encoding: 'utf8', windowsHide: true, timeout: 10000 });
writeFileSync(resolve(__dirname, 'verified-stderr.log'), result.stderr ?? '');
writeFileSync(resolve(__dirname, 'verified-stdout.log'), result.stdout ?? '');
assert.equal(result.error, undefined);
assert.equal(result.status, 1);
assert.match(result.stderr, /DATABASE_URL must be a PostgreSQL URL/);
assert.doesNotMatch(result.stderr, /diagnostic blocked a TCP connection/);
const network = JSON.parse(readFileSync(reportPath, 'utf8'));
assert.equal(network.attempts, 0);
assert.equal(network.code, 1);
console.log(JSON.stringify({ status: 'expected-config-failure', exit: result.status, tcpConnectionAttempts: network.attempts, environmentFilePresent: false }));
