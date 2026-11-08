/**
 * DSS Universe — local Mailpit recovery verification.
 * File: node_modules/.cache/debt013-check-mailbox.cjs
 * Purpose: validate disposable copies of preserved SQLite/WAL sets.
 * Ownership: ignored diagnostics; no runtime integration or message disclosure.
 * Invariants: read-only queries, no message bodies, no original backup mutation.
 */
const { DatabaseSync } = require('node:sqlite');
const { readdirSync } = require('node:fs');
const { resolve } = require('node:path');
const directory = resolve('node_modules/.cache/mailpit-preservation-20261025-01-verify');
const results = [];
for (const name of readdirSync(directory).filter(name => name.endsWith('.db'))) {
  const database = new DatabaseSync(resolve(directory, name), { readOnly: true });
  try {
    database.exec('PRAGMA query_only = ON');
    const integrity = database.prepare('PRAGMA integrity_check').all();
    const valid = integrity.length === 1 && Object.values(integrity[0])[0] === 'ok';
    const tables = database.prepare("SELECT count(*) AS count FROM sqlite_master WHERE type='table'").get();
    const counts = database.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().map(({ name }) => ({
      table: name,
      rows: Number(database.prepare('SELECT count(*) AS count FROM "' + name.replaceAll('"', '""') + '"').get().count),
    }));
    results.push({ index: results.length + 1, valid, tables: Number(tables.count), counts });
    if (!valid) process.exitCode = 1;
  } finally {
    database.close();
  }
}
if (results.length !== 8) process.exitCode = 1;
console.log(JSON.stringify({ databases: results.length, results }, null, 2));
