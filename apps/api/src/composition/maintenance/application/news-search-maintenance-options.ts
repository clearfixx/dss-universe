/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Maintenance Composition
 * 📄 File: apps/api/src/composition/maintenance/application/news-search-maintenance-options.ts
 *
 * 🎯 Purpose:
 * Validates an explicit maintenance target before opening any application connections.
 *
 * 🧠 Responsibilities:
 * • accepts only check/backfill commands and bounded batch size;
 * • requires database-name confirmation before writes and explicit remote opt-in;
 * • returns no database credentials or connection URL.
 *
 * 🏗️ Architecture:
 * Pure operational argument validation, independent of feature internals.
 *
 * ⚠️ Important:
 * A command-line target guard is not authorization to execute against a remote system.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { parseArgs } from 'node:util';

export type NewsSearchMaintenanceOptions = Readonly<{
  command: 'check' | 'backfill';
  batchSize: number;
  databaseName: string;
}>;

export function parseNewsSearchMaintenanceOptions(
  args: string[],
  databaseUrl: string | undefined,
): NewsSearchMaintenanceOptions {
  const { values, positionals } = parseArgs({
    args,
    strict: true,
    allowPositionals: true,
    options: {
      'confirm-database': { type: 'string' },
      'batch-size': { type: 'string' },
      'allow-remote': { type: 'boolean' },
    },
  });
  const command = positionals[0];
  if (
    positionals.length !== 1 ||
    (command !== 'check' && command !== 'backfill')
  ) {
    throw new Error('Expected one check or backfill command.');
  }
  if (!databaseUrl) throw new Error('DATABASE_URL is required.');
  const target = new URL(databaseUrl);
  if (!['postgresql:', 'postgres:'].includes(target.protocol))
    throw new Error('Expected PostgreSQL.');
  if (
    !['127.0.0.1', 'localhost', '[::1]'].includes(target.hostname) &&
    !values['allow-remote']
  ) {
    throw new Error(
      'Remote database requires explicit operational approval and --allow-remote.',
    );
  }
  const databaseName = decodeURIComponent(target.pathname.slice(1));
  if (!databaseName) throw new Error('Database name is required.');
  if (command === 'backfill' && values['confirm-database'] !== databaseName) {
    throw new Error(
      'Backfill requires exact --confirm-database matching the configured target.',
    );
  }
  if (command === 'check' && values['batch-size'] !== undefined)
    throw new Error('Batch size applies only to backfill.');
  const size = values['batch-size'] ?? '64';
  if (!/^\d+$/.test(size) || Number(size) < 1 || Number(size) > 250) {
    throw new Error('Batch size must be 1–250.');
  }
  return { command, batchSize: Number(size), databaseName };
}
