/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Access Group Display
 * 📄 File: apps/api/src/composition/access-groups/infrastructure/profile-group-display.adapter.ts
 *
 * 🎯 Purpose:
 * Supplies current public group appearance without exposing grants or authority.
 *
 * 🧠 Responsibilities:
 * • applies current account eligibility to display projection;
 * • requests only public, currently effective group appearance;
 * • keeps grant history and capability data out of profile display.
 *
 * 🏗️ Architecture:
 * Root adapter between published IAM/Auth contracts and a Users-owned port.
 *
 * ⚠️ Important:
 * Public display is not proof of authority; hidden membership still authorizes.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Inject, Injectable } from '@nestjs/common';
import {
  IAM_PUBLIC_GROUP_DISPLAY,
  type IamPublicGroupDisplayReader,
} from '@api/modules/iam';
import {
  AUTH_SUBJECT_ELIGIBILITY,
  type AuthSubjectEligibility,
} from '@api/modules/auth';
import type { ProfileGroupDisplayReader } from '@api/modules/users';
@Injectable()
export class ProfileGroupDisplayAdapter implements ProfileGroupDisplayReader {
  constructor(
    @Inject(IAM_PUBLIC_GROUP_DISPLAY)
    private readonly source: IamPublicGroupDisplayReader,
    @Inject(AUTH_SUBJECT_ELIGIBILITY)
    private readonly eligibility: AuthSubjectEligibility,
  ) {}
  async read(subjectId: string, at: Date) {
    if (!(await this.eligibility.isEligible(subjectId))) return [];
    return this.source.readPublic(subjectId, at);
  }
}
