/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/application/services/password-hash.service.spec.ts
 *
 * 🎯 Purpose:
 * Verifies real bcrypt interoperability through explicit hashing imports.
 *
 * 🏗️ Architecture:
 * Auth application regression using synthetic secrets and the installed library.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { getRounds } from 'bcrypt';
import { PasswordHashService } from './password-hash.service';

describe('PasswordHashService', () => {
  const service = new PasswordHashService();

  it('preserves cost and accepts only the matching synthetic secret', async () => {
    const value = 'synthetic-password-not-a-real-credential';
    const encoded = await service.hash(value);
    expect(encoded).not.toBe(value);
    expect(getRounds(encoded)).toBe(12);
    await expect(service.compare(value, encoded)).resolves.toBe(true);
    await expect(
      service.compare('different-synthetic-secret', encoded),
    ).resolves.toBe(false);
  });

  it('generates independent salts for the same synthetic secret', async () => {
    const value = 'synthetic-refresh-credential';
    const first = await service.hash(value);
    const second = await service.hash(value);
    expect(first).not.toBe(second);
    await expect(service.compare(value, first)).resolves.toBe(true);
    await expect(service.compare(value, second)).resolves.toBe(true);
  });
});
