/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Identity Presentation
 * 📄 File: apps/api/src/composition/identity/presentation/authentication-metadata.characterization.spec.ts
 * 🎯 Purpose: Protects concrete REST DTO validation across compiler pipelines.
 * 🧠 Responsibilities: verifies metadata, whitelist and approved optional displayName.
 * 🏗️ Architecture: Reflection/pipe contract tests; no database or authentication doubles.
 * ⚠️ Important: GraphQL registration remains required and is checked separately.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { ValidationPipe, type Type } from '@nestjs/common';
import { LoginDto, RefreshTokenDto } from '@api/modules/auth/presentation';
import { AuthenticationController } from './authentication.controller';
import { RegisterDto } from './dto/register.dto';
import { RegisterInput } from './graphql/inputs/register.input';

describe('REST DTO validation contract', () => {
  const valid = {
    email: 'synthetic@dss.test',
    username: 'synthetic',
    password: 'synthetic-password-123',
  };
  const pipe = () =>
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidUnknownValues: true,
    });
  it.each([
    ['register', RegisterDto],
    ['login', LoginDto],
    ['refresh', RefreshTokenDto],
  ] as const)('%s retains its runtime DTO constructor', (method, expected) => {
    const [metatype] = Reflect.getMetadata(
      'design:paramtypes',
      AuthenticationController.prototype,
      method,
    ) as unknown[];
    expect(metatype).toBe(expected);
  });
  it('allows omitted REST displayName and removes unknown fields', async () => {
    await expect(
      pipe().transform(
        { ...valid, unknown: 'discard' },
        { type: 'body', metatype: RegisterDto },
      ),
    ).resolves.toEqual(valid);
  });
  it('preserves a provided displayName', async () => {
    const body = { ...valid, displayName: 'Synthetic Pilot' };
    await expect(
      pipe().transform(body, { type: 'body', metatype: RegisterDto }),
    ).resolves.toEqual(body);
  });
  it.each([null, '', '   ', 42])(
    'rejects invalid provided displayName %p',
    async (displayName) => {
      await expect(
        pipe().transform(
          { ...valid, displayName },
          { type: 'body', metatype: RegisterDto },
        ),
      ).rejects.toMatchObject({ status: 400 });
    },
  );
  it('keeps GraphQL displayName required', async () => {
    await expect(
      pipe().transform(valid, { type: 'body', metatype: RegisterInput }),
    ).rejects.toMatchObject({ status: 400 });
  });
  it.each([
    [RegisterDto, { ...valid, email: 'invalid' }],
    [RegisterDto, { ...valid, username: '' }],
    [RegisterDto, { ...valid, password: 'short' }],
    [
      LoginDto,
      {
        email: valid.email,
        password: valid.password,
        twoFactorCode: 'invalid',
      },
    ],
    [RefreshTokenDto, {}],
    [RefreshTokenDto, { refreshToken: 42 }],
  ] as [Type<unknown>, Record<string, unknown>][])(
    'rejects invalid DTO case %#',
    async (metatype, body) => {
      await expect(
        pipe().transform(body, { type: 'body', metatype }),
      ).rejects.toMatchObject({ status: 400 });
    },
  );
  it('preserves REST empty-string refresh validation for service-level denial', async () => {
    await expect(
      pipe().transform(
        { refreshToken: '' },
        { type: 'body', metatype: RefreshTokenDto },
      ),
    ).resolves.toEqual({ refreshToken: '' });
  });
});
