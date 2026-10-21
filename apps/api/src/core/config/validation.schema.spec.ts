/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * ⚙️ Module: Configuration Tests
 * 📄 File: apps/api/src/core/config/validation.schema.spec.ts
 *
 * 🎯 Purpose:
 * Preserves the complete environment schema across the explicit Joi interop boundary.
 *
 * 🧠 Responsibilities:
 * • pins defaults, production requirements and bounded configuration;
 * • rejects namespace imports without changing validation policy.
 *
 * 🏗️ Architecture:
 * Pure schema/source regression; no process environment, service IO or credentials.
 *
 * ⚠️ Important:
 * The schema fingerprint is pre-transfer evidence, not a replacement for behavior tests.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  createSourceFile,
  isImportDeclaration,
  ScriptTarget,
} from 'typescript';
import { validationSchema } from './validation.schema';

const required = {
  DATABASE_URL: 'postgresql://synthetic@127.0.0.1/synthetic',
  JWT_ACCESS_SECRET: 'synthetic-access-secret',
  JWT_REFRESH_SECRET: 'synthetic-refresh-secret',
};

describe('environment validation interop', () => {
  it('uses the explicit Joi default binding rather than a namespace import', () => {
    const source = createSourceFile(
      'validation.schema.ts',
      readFileSync(join(__dirname, 'validation.schema.ts'), 'utf8'),
      ScriptTarget.Latest,
    );
    const imports = source.statements
      .filter(isImportDeclaration)
      .filter((entry) => entry.moduleSpecifier.getText(source) === "'joi'");
    expect(imports).toHaveLength(1);
    expect(imports[0].importClause?.name?.text).toBe('Joi');
    expect(imports[0].importClause?.namedBindings).toBeUndefined();
  });

  it('retains the pre-transfer full schema description', () => {
    expect(
      createHash('sha256')
        .update(JSON.stringify(validationSchema.describe()))
        .digest('hex'),
    ).toBe('a5cde90fe1e766caa47efa15f182b517528abaeec35ab1594cd26359e1c418ac');
  });

  it('keeps development defaults without external configuration', () => {
    const result = validationSchema.validate(required);
    expect(result.error).toBeUndefined();
    expect(result.value).toMatchObject({
      NODE_ENV: 'development',
      PORT: 3001,
      REDIS_PORT: 6379,
      OPENAI_TIMEOUT_MS: 30000,
    });
  });

  it('requires both production encryption/signing keys', () => {
    const result = validationSchema.validate(
      { ...required, NODE_ENV: 'production' },
      { abortEarly: false },
    );
    expect(
      result.error?.details.map((detail) => detail.path.join('.')).sort(),
    ).toEqual(['AUTH_2FA_ENCRYPTION_KEY', 'MEDIA_SIGNING_SECRET']);
  });

  it('accepts production with explicit synthetic keys', () => {
    expect(
      validationSchema.validate({
        ...required,
        NODE_ENV: 'production',
        MEDIA_SIGNING_SECRET: 's'.repeat(32),
        AUTH_2FA_ENCRYPTION_KEY: 'k'.repeat(32),
      }).error,
    ).toBeUndefined();
  });

  it('retains the configured inference timeout bounds', () => {
    expect(
      validationSchema.validate({ ...required, OPENAI_TIMEOUT_MS: 999 }).error
        ?.details[0].path,
    ).toEqual(['OPENAI_TIMEOUT_MS']);
    expect(
      validationSchema.validate({ ...required, OPENAI_TIMEOUT_MS: 120001 })
        .error?.details[0].path,
    ).toEqual(['OPENAI_TIMEOUT_MS']);
  });
});
