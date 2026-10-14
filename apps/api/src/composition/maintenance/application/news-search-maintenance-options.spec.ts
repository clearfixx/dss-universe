/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Maintenance Composition Tests
 * 📄 File: apps/api/src/composition/maintenance/application/news-search-maintenance-options.spec.ts
 *
 * 🎯 Purpose:
 * Pins explicit write targets, remote opt-in and credential-free option results.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { parseNewsSearchMaintenanceOptions } from './news-search-maintenance-options';

describe('News search maintenance options', () => {
  const local =
    'postgresql://operator:synthetic-password@127.0.0.1:5434/dss_test';
  it('allows read-only local readiness without write confirmation and exposes no credential/URL', () => {
    expect(parseNewsSearchMaintenanceOptions(['check'], local)).toEqual({
      command: 'check',
      batchSize: 64,
      databaseName: 'dss_test',
    });
  });
  it('requires exact target confirmation before a bounded backfill', () => {
    expect(
      parseNewsSearchMaintenanceOptions(
        ['backfill', '--confirm-database=dss_test', '--batch-size=7'],
        local,
      ),
    ).toEqual({ command: 'backfill', batchSize: 7, databaseName: 'dss_test' });
    expect(() =>
      parseNewsSearchMaintenanceOptions(['backfill'], local),
    ).toThrow('confirm-database');
    expect(() =>
      parseNewsSearchMaintenanceOptions(
        ['backfill', '--confirm-database=other'],
        local,
      ),
    ).toThrow('confirm-database');
  });
  it('requires a separate explicit remote opt-in, which does not replace write target confirmation', () => {
    const remote = local.replace('127.0.0.1', 'database.invalid');
    expect(() => parseNewsSearchMaintenanceOptions(['check'], remote)).toThrow(
      'allow-remote',
    );
    expect(() =>
      parseNewsSearchMaintenanceOptions(['backfill', '--allow-remote'], remote),
    ).toThrow('confirm-database');
    expect(
      parseNewsSearchMaintenanceOptions(
        ['backfill', '--allow-remote', '--confirm-database=dss_test'],
        remote,
      ).command,
    ).toBe('backfill');
  });
  it.each(['0', '-1', '251', '1.5', 'NaN', 'Infinity'])(
    'rejects invalid batch size %s',
    (size) => {
      expect(() =>
        parseNewsSearchMaintenanceOptions(
          ['backfill', '--confirm-database=dss_test', '--batch-size=' + size],
          local,
        ),
      ).toThrow();
    },
  );
  it.each([
    { args: [] },
    { args: ['restore'] },
    { args: ['backfill', 'extra'] },
    { args: ['check', '--batch-size=7'] },
    { args: ['check', '--unknown'] },
  ])('rejects unsupported arguments $args before IO', ({ args }) => {
    expect(() => parseNewsSearchMaintenanceOptions(args, local)).toThrow();
  });
  it('rejects absent/invalid targets rather than guessing a development database', () => {
    expect(() =>
      parseNewsSearchMaintenanceOptions(['check'], undefined),
    ).toThrow('DATABASE_URL');
    expect(() =>
      parseNewsSearchMaintenanceOptions(['check'], 'not-a-url'),
    ).toThrow();
    expect(() =>
      parseNewsSearchMaintenanceOptions(
        ['check'],
        'https://127.0.0.1/dss_test',
      ),
    ).toThrow('PostgreSQL');
    expect(() =>
      parseNewsSearchMaintenanceOptions(['check'], 'postgresql://127.0.0.1/'),
    ).toThrow('Database name');
  });
});
