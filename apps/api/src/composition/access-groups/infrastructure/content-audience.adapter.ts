/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Access Group Composition
 * 📄 File: apps/api/src/composition/access-groups/infrastructure/content-audience.adapter.ts
 *
 * 🎯 Purpose:
 * Adapts audience decisions without giving Content Access IAM repository knowledge.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Inject, Injectable } from '@nestjs/common';
import {
  ACCESS_CAPABILITY_DECISIONS,
  type AccessCapabilityDecisions,
} from '@api/core/authorization';
import type { ContentAudienceReader } from '@api/modules/content-access';
@Injectable()
export class ContentAudienceAdapter implements ContentAudienceReader {
  constructor(
    @Inject(ACCESS_CAPABILITY_DECISIONS)
    private readonly decisions: AccessCapabilityDecisions,
  ) {}
  read(subjectId: string, at: Date) {
    return this.decisions.audience(subjectId, at);
  }
}
