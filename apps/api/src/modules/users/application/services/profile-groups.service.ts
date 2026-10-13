/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Access Group Display
 * 📄 File: apps/api/src/modules/users/application/services/profile-groups.service.ts
 *
 * 🎯 Purpose:
 * Supplies current public group appearance without exposing grants or authority.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Inject, Injectable } from '@nestjs/common';
import {
  PROFILE_GROUP_DISPLAY,
  type ProfileGroupDisplayReader,
} from '../../contracts/profile-group-display.contract';
@Injectable()
export class ProfileGroupsService {
  constructor(
    @Inject(PROFILE_GROUP_DISPLAY)
    private readonly display: ProfileGroupDisplayReader,
  ) {}
  read(subjectId: string) {
    return this.display.read(subjectId, new Date());
  }
}
