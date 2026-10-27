/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Root Error Contract Characterization
 * 📄 File: apps/api/src/core/graphql/errors/domain-exception-constructor.characterization.spec.ts
 * 🎯 Purpose: Protects pure owner failure identities during presentation decoupling.
 * 🧠 Responsibilities: checks stable messages and absence of transport methods.
 * 🏗️ Architecture: Test-only cross-owner inventory; no production composition.
 * ⚠️ Important: Does not prove actual REST/Apollo handling or authorization.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { InvalidCredentialsException } from '../../../modules/auth/domain/exceptions/invalid-credentials.exception';
import { HttpException } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  createSourceFile,
  isImportDeclaration,
  isStringLiteral,
  ScriptTarget,
} from 'typescript';
import { EmailAlreadyExistsException } from '../../../modules/auth/domain/exceptions/email-already-exists.exception';
import { TwoFactorRequiredException } from '../../../modules/auth/domain/exceptions/two-factor-required.exception';
import { LoginRateLimitedException } from '../../../modules/auth/domain/exceptions/login-rate-limited.exception';
import { UserNotFoundException } from '../../../modules/users/domain/exceptions/user-not-found.exception';
import { AvatarMediaForbiddenException } from '../../../modules/media/domain/exceptions/avatar-media-forbidden.exception';
import { CoverMediaForbiddenException } from '../../../modules/media/domain/exceptions/cover-media-forbidden.exception';
import { InvalidAvatarMediaException } from '../../../modules/media/domain/exceptions/invalid-avatar-media.exception';
import { InvalidCoverMediaException } from '../../../modules/media/domain/exceptions/invalid-cover-media.exception';
import { MediaAccessForbiddenException } from '../../../modules/media/domain/exceptions/media-access-forbidden.exception';

describe('DEBT-079 pure owner failure identities', () => {
  it('keeps all ten owner source files free of Nest imports', () => {
    const files = [
      'auth/domain/exceptions/invalid-credentials.exception.ts',
      'auth/domain/exceptions/email-already-exists.exception.ts',
      'auth/domain/exceptions/two-factor-required.exception.ts',
      'auth/domain/exceptions/login-rate-limited.exception.ts',
      'users/domain/exceptions/user-not-found.exception.ts',
      'media/domain/exceptions/avatar-media-forbidden.exception.ts',
      'media/domain/exceptions/cover-media-forbidden.exception.ts',
      'media/domain/exceptions/invalid-avatar-media.exception.ts',
      'media/domain/exceptions/invalid-cover-media.exception.ts',
      'media/domain/exceptions/media-access-forbidden.exception.ts',
    ];
    for (const file of files) {
      const source = createSourceFile(
        file,
        readFileSync(resolve(__dirname, '../../../modules', file), 'utf8'),
        ScriptTarget.Latest,
        true,
      );
      const imports = source.statements
        .filter(isImportDeclaration)
        .flatMap((entry) =>
          isStringLiteral(entry.moduleSpecifier)
            ? [entry.moduleSpecifier.text]
            : [],
        );
      expect({
        file,
        frameworkImports: imports.filter((name) => name.startsWith('@nestjs/')),
      }).toEqual({ file, frameworkImports: [] });
    }
  });
  it.each([
    [InvalidCredentialsException, 'Invalid email or password'],
    [EmailAlreadyExistsException, 'User with this email already exists'],
    [
      TwoFactorRequiredException,
      'A valid two-factor or recovery code is required.',
    ],
    [UserNotFoundException, 'User not found'],
    [
      AvatarMediaForbiddenException,
      'You can only use your own media as an avatar.',
    ],
    [
      CoverMediaForbiddenException,
      'You can only use your own media as a profile cover.',
    ],
    [
      InvalidAvatarMediaException,
      'The selected media cannot be used as an avatar.',
    ],
    [
      InvalidCoverMediaException,
      'The selected media cannot be used as a profile cover.',
    ],
    [MediaAccessForbiddenException, 'You do not have access to this media.'],
  ] as const)(
    '%p preserves its message without inheriting transport',
    (Failure, message) => {
      const failure = new Failure();
      expect(failure).toBeInstanceOf(Error);
      expect(failure).toBeInstanceOf(Failure);
      expect(failure).not.toBeInstanceOf(HttpException);
      expect(failure.message).toBe(message);
      expect(failure).not.toHaveProperty('getStatus');
      expect(failure).not.toHaveProperty('getResponse');
    },
  );

  it('keeps rate-limit identity and message without a transport envelope', () => {
    const failure = new LoginRateLimitedException();
    const message = 'Login is temporarily unavailable. Please try again later.';
    expect(failure).not.toBeInstanceOf(HttpException);
    expect(failure.message).toBe(message);
    expect(failure).not.toHaveProperty('getStatus');
    expect(failure).not.toHaveProperty('getResponse');
  });

  it.each([
    [
      InvalidAvatarMediaException,
      'The selected media is missing its processed avatar variant.',
    ],
    [
      InvalidCoverMediaException,
      'The selected media is missing its processed cover variant.',
    ],
  ] as const)(
    '%p preserves its eligibility-specific message',
    (Failure, message) => {
      const failure = new Failure(message);
      expect(failure).toBeInstanceOf(Failure);
      expect(failure.message).toBe(message);
      expect(failure).not.toBeInstanceOf(HttpException);
    },
  );
});
