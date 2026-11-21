/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Forum (Community Hub)
 * 📄 File: apps/api/src/modules/forum/infrastructure/forum-viewer-facts.adapter.ts
 *
 * 🎯 Purpose:
 * Builds Forum viewer facts from Authorization's current audience and permissions.
 *
 * ⚠️ Important:
 * Ineligible or unknown subjects are treated as guests (fail closed).
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Inject, Injectable } from '@nestjs/common';
import {
  ACCESS_CAPABILITY_DECISIONS,
  Permission,
  SUBJECT_ACCESS_READER,
  type AccessCapabilityDecisions,
  type SubjectAccessReader,
} from '@api/core/authorization';
import type { ForumViewerFactsReader } from '../contracts/forum-viewer-facts.contract';
import type { ForumViewerFacts } from '../domain/types/forum-structure.type';

const GUEST: ForumViewerFacts = {
  subjectId: null,
  audienceKeys: [],
  seesAllCategories: false,
  moderatesAllCategories: false,
  canAssignModerators: false,
};

@Injectable()
export class ForumViewerFactsAdapter implements ForumViewerFactsReader {
  constructor(
    @Inject(ACCESS_CAPABILITY_DECISIONS)
    private readonly access: AccessCapabilityDecisions,
    @Inject(SUBJECT_ACCESS_READER)
    private readonly subjects: SubjectAccessReader,
  ) {}

  async read(subjectId: string | null, at: Date): Promise<ForumViewerFacts> {
    if (!subjectId) return GUEST;
    const audience = await this.access.audience(subjectId, at);
    if (!audience) return GUEST;
    const profile = await this.subjects.getAccessProfileByUserId(subjectId);
    const permissions = new Set(profile.permissions);
    return {
      subjectId,
      audienceKeys: audience.groups,
      seesAllCategories: permissions.has(Permission.ForumStructureManage),
      moderatesAllCategories: permissions.has(Permission.ForumModerateAll),
      canAssignModerators: permissions.has(Permission.ForumModeratorsAssign),
    };
  }
}
