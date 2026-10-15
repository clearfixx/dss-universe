/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users Profile Composition
 * 📄 File: apps/api/src/composition/users-profiles/infrastructure/profile-role-names.adapter.ts
 *
 * 🎯 Purpose:
 * Adapts IAM role display to the Users-owned display input port.
 *
 * 🧠 Responsibilities:
 * • copies only role-name arrays for requested subject IDs;
 * • does not expose provider maps, assignment records or staff authority.
 *
 * 🏗️ Architecture:
 * Root synchronous display adapter; no SQL, caching or policy.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Inject, Injectable } from '@nestjs/common';
import {
  IAM_ROLE_DISPLAY_READER,
  type IamRoleDisplayReader,
} from '@api/modules/iam';
import type { ProfileRoleNamesReader } from '@api/modules/users';
@Injectable()
export class ProfileRoleNamesAdapter implements ProfileRoleNamesReader {
  constructor(
    @Inject(IAM_ROLE_DISPLAY_READER)
    private readonly roles: IamRoleDisplayReader,
  ) {}
  async readNames(subjectIds: readonly string[]) {
    const names = await this.roles.readNames(subjectIds);
    return new Map(subjectIds.map((id) => [id, [...(names.get(id) ?? [])]]));
  }
}
