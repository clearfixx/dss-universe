/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Storage
 * 📄 File: apps/api/src/core/storage/providers/local-storage.provider.spec.ts
 *
 * 🎯 Purpose:
 * Verifies nested local persistence and uploads-root path isolation.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { LocalStorageProvider } from './local-storage.provider';

describe('LocalStorageProvider', () => {
  let uploadsRoot: string;

  beforeEach(async () => {
    uploadsRoot = await mkdtemp(join(tmpdir(), 'dss-storage-'));
    process.env.DSS_UPLOADS_DIR = uploadsRoot;
  });

  afterEach(async () => {
    delete process.env.DSS_UPLOADS_DIR;
    await rm(uploadsRoot, { recursive: true, force: true });
  });

  it('persists nested opaque storage keys', async () => {
    const provider = new LocalStorageProvider();
    const saved = await provider.save({
      buffer: Buffer.from('DSS'),
      directory: 'temporary/owner-1',
      filename: 'upload-1',
    });

    expect(saved.path).toBe('temporary/owner-1/upload-1');
    await expect(readFile(join(uploadsRoot, saved.path), 'utf8')).resolves.toBe(
      'DSS',
    );
  });

  it('rejects paths outside the configured uploads root', async () => {
    const provider = new LocalStorageProvider();
    await expect(
      provider.save({
        buffer: Buffer.from('escape'),
        directory: '../outside',
        filename: 'file.txt',
      }),
    ).rejects.toThrow('escapes the configured uploads root');
  });
});
