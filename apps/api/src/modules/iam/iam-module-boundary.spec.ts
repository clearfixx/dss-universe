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
import { IAM_ACCESS_MEMBERSHIPS } from './access-groups/contracts/effective-memberships.contract';
import { IAM_PUBLIC_GROUP_DISPLAY } from './access-groups/contracts/public-group-display.contract';
import { IAM_ROLE_DISPLAY_READER } from './contracts/role-display-reader.contract';
import { IAM_ROLE_PERMISSION_KEYS_READER } from './contracts/role-permission-keys-reader.contract';

describe('IAM integration boundary', () => {
  it('keeps every application service and repository private', () => {
    expect(
      Reflect.getMetadata(MODULE_METADATA.EXPORTS, IamModule) ?? [],
    ).toEqual([
      IAM_ROLE_PERMISSION_KEYS_READER,
      IAM_ACCESS_MEMBERSHIPS,
      IAM_PUBLIC_GROUP_DISPLAY,
      IAM_ROLE_DISPLAY_READER,
    ]);
  });
});
