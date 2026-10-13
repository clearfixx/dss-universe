/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: IAM
 * 📄 File: apps/api/src/modules/iam/iam-module-boundary.spec.ts
 *
 * 🎯 Purpose:
 * Prevents internal IAM providers from becoming injectable integration APIs.
 *
 * 🏗️ Architecture:
 * Module metadata regression; HTTP behavior is verified by existing E2E suites.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import 'reflect-metadata';
import { MODULE_METADATA } from '@nestjs/common/constants';
import { IamModule } from './iam.module';

describe('IAM integration boundary', () => {
  it('keeps every application service and repository private', () => {
    expect(
      Reflect.getMetadata(MODULE_METADATA.EXPORTS, IamModule) ?? [],
    ).toEqual([]);
  });
});
