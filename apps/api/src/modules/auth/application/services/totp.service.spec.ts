import { ConfigService } from '@nestjs/config';

import { TotpService } from './totp.service';

describe('TotpService', () => {
  const service = new TotpService(
    new ConfigService({
      AUTH_2FA_ENCRYPTION_KEY: 'test-key-at-least-32-characters-long',
    }),
  );

  it('matches the RFC 6238 SHA-1 test vector after truncating to six digits', () => {
    const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
    expect(service.code(secret, 1)).toBe('287082');
    expect(service.verify(secret, '287082', 59_000)).toBe(true);
  });

  it('encrypts secrets with a random authenticated envelope', () => {
    const first = service.encrypt('TOPSECRET');
    const second = service.encrypt('TOPSECRET');
    expect(first).not.toBe(second);
    expect(service.decrypt(first)).toBe('TOPSECRET');
  });

  it.each([
    ['IV', 0],
    ['authentication tag', 1],
    ['ciphertext', 2],
  ] as const)(
    'rejects an actual byte change in the %s',
    (_component, index) => {
      const envelope = service.encrypt('TOPSECRET');
      const parts = envelope.split('.');
      expect(parts).toHaveLength(3);
      const original = Buffer.from(parts[index], 'base64url');
      expect(original.length).toBeGreaterThan(0);
      const changed = Buffer.from(original);
      changed[0] ^= 0x01;
      expect(changed).not.toEqual(original);
      parts[index] = changed.toString('base64url');
      const corrupted = parts.join('.');
      expect(corrupted).not.toBe(envelope);
      expect(service.decrypt(envelope)).toBe('TOPSECRET');
      expect(() => service.decrypt(corrupted)).toThrow();
    },
  );

  it('normalizes recovery codes before keyed hashing', () => {
    expect(service.recoveryHash('ABCDEF-123456')).toBe(
      service.recoveryHash(' abcdef-123456 '),
    );
    expect(service.recoveryCode()).toMatch(/^[a-f0-9]{6}-[a-f0-9]{6}$/);
  });
});
