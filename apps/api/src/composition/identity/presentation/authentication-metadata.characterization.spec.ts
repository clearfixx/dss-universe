/**
 * DSS Universe — Identity Compatibility
 * File: apps/api/src/composition/identity/presentation/authentication-metadata.characterization.spec.ts
 * Purpose: Characterizes current Jest metadata independently of production build.
 * Architecture: Reflection/pipe only; no credentials, database or AppModule.
 * Important: This pins the pre-correction discrepancy, not the intended final DTO contract.
 */
import { ValidationPipe } from '@nestjs/common';
import { AuthenticationController } from './authentication.controller';

describe('pre-correction Jest REST metadata', () => {
  it.each(['register', 'login', 'refresh'] as const)(
    '%s emits Object and skips decorated DTO validation',
    async (method) => {
      const [metatype] = Reflect.getMetadata(
        'design:paramtypes',
        AuthenticationController.prototype,
        method,
      ) as unknown[];
      expect(metatype).toBe(Object);
      const value = { syntheticUnvalidatedField: true };
      const pipe = new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidUnknownValues: true,
      });
      await expect(
        pipe.transform(value, { type: 'body', metatype: Object }),
      ).resolves.toEqual(value);
    },
  );
});
