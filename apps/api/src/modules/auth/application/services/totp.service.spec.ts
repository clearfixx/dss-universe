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
    expect(() => service.decrypt(`${first.slice(0, -1)}x`)).toThrow();
  });

  it('normalizes recovery codes before keyed hashing', () => {
    expect(service.recoveryHash('ABCDEF-123456')).toBe(
      service.recoveryHash(' abcdef-123456 '),
    );
    expect(service.recoveryCode()).toMatch(/^[a-f0-9]{6}-[a-f0-9]{6}$/);
  });
});
