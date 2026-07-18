/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 🛡️ Module: IAM Safety
 * 📄 File: apps/api/src/modules/iam/safety/iam-safety.service.spec.ts
 *
 * 🎯 Purpose:
 * Verifies safeguards around critical administrative roles.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { BadRequestException } from '@nestjs/common';

import { IamSafetyService } from './iam-safety.service';

describe('IamSafetyService', () => {
  const service = new IamSafetyService();

  it.each(['admin', ' ADMIN ', 'super_admin'])(
    'prevents deleting protected role %s',
    (role) => {
      expect(() => service.assertRoleCanBeDeleted(role)).toThrow(
        BadRequestException,
      );
    },
  );

  it('allows deleting an ordinary custom role', () => {
    expect(() => service.assertRoleCanBeDeleted('editors')).not.toThrow();
  });

  it('prevents removing the final administrator', () => {
    expect(() =>
      service.assertLastAdminRoleIsNotRemoved({
        roleName: 'admin',
        adminsWithRoleCount: 1,
      }),
    ).toThrow(BadRequestException);
  });

  it('allows removing an administrator when another remains', () => {
    expect(() =>
      service.assertLastAdminRoleIsNotRemoved({
        roleName: 'admin',
        adminsWithRoleCount: 2,
      }),
    ).not.toThrow();
  });
});
