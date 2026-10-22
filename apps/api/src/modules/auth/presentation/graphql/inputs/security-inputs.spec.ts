/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/presentation/graphql/inputs/security-inputs.spec.ts
 * 🎯 Purpose: Preserves validation at the extracted security input boundary.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { validateSync } from 'class-validator';
import { ConfirmTwoFactorInput } from './confirm-two-factor.input';
import { DisableTwoFactorInput } from './disable-two-factor.input';
import { RequestPasswordRecoveryInput } from './request-password-recovery.input';
import { ResetPasswordInput } from './reset-password.input';
import { VerifyEmailInput } from './verify-email.input';

describe('Security transport inputs', () => {
  it.each(['a'.repeat(64), '0123456789abcdef'.repeat(4)])(
    'accepts the existing lowercase hexadecimal verification token %s',
    (token) => {
      expect(
        validateSync(Object.assign(new VerifyEmailInput(), { token })),
      ).toEqual([]);
    },
  );

  it.each(['A'.repeat(64), 'a'.repeat(63), 'g'.repeat(64), '', 123])(
    'rejects an invalid verification token %s',
    (token) => {
      expect(
        validateSync(Object.assign(new VerifyEmailInput(), { token })),
      ).not.toEqual([]);
    },
  );

  it('preserves recovery email validation and its maximum length', () => {
    expect(
      validateSync(
        Object.assign(new RequestPasswordRecoveryInput(), {
          email: 'member@example.com',
        }),
      ),
    ).toEqual([]);
    for (const email of ['invalid', `${'a'.repeat(255)}@example.com`]) {
      expect(
        validateSync(
          Object.assign(new RequestPasswordRecoveryInput(), { email }),
        ),
      ).not.toEqual([]);
    }
  });

  it('preserves both reset token and password constraints', () => {
    for (const password of ['p'.repeat(8), 'p'.repeat(72)]) {
      expect(
        validateSync(
          Object.assign(new ResetPasswordInput(), {
            token: 'a'.repeat(64),
            password,
          }),
        ),
      ).toEqual([]);
    }
    for (const fields of [
      { token: 'a'.repeat(63), password: 'password' },
      { token: 'a'.repeat(64), password: 'p'.repeat(7) },
      { token: 'a'.repeat(64), password: 'p'.repeat(73) },
    ]) {
      expect(
        validateSync(Object.assign(new ResetPasswordInput(), fields)),
      ).not.toEqual([]);
    }
  });

  it('requires exactly six digits for confirmation', () => {
    expect(
      validateSync(
        Object.assign(new ConfirmTwoFactorInput(), { code: '012345' }),
      ),
    ).toEqual([]);
    for (const code of ['12345', '1234567', 'abcdef', 'abcdef-abcdef']) {
      expect(
        validateSync(Object.assign(new ConfirmTwoFactorInput(), { code })),
      ).not.toEqual([]);
    }
  });

  it('retains disable password and TOTP/recovery-code validation', () => {
    for (const code of ['012345', 'abcdef-012345', 'ABCDEF-012345']) {
      expect(
        validateSync(
          Object.assign(new DisableTwoFactorInput(), {
            password: 'password',
            code,
          }),
        ),
      ).toEqual([]);
    }
    for (const fields of [
      { password: 'short', code: '012345' },
      { password: 'password', code: '12345' },
      { password: 'password', code: 'ghijkl-012345' },
    ]) {
      expect(
        validateSync(Object.assign(new DisableTwoFactorInput(), fields)),
      ).not.toEqual([]);
    }
  });
});
