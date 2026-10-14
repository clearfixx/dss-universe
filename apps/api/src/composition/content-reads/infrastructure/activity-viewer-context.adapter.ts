/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Content Read Composition
 * 📄 File: apps/api/src/composition/content-reads/infrastructure/activity-viewer-context.adapter.ts
 *
 * 🎯 Purpose:
 * Adapts only published Users personalization facts to the Activity-owned input contract.
 *
 * 🧠 Responsibilities:
 * • copies three allowlisted arrays without foreign records or mutable aliasing;
 * • propagates owner failures without empty-context fallback.
 *
 * 🏗️ Architecture:
 * Root adapter between independently owned Users and Activity contracts.
 *
 * ⚠️ Important:
 * Activity receives no credentials, status, role or profile aggregate.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Inject, Injectable } from '@nestjs/common';
import {
  USER_ACTIVITY_CONTEXT_READER,
  type UserActivityContextReader,
} from '@api/modules/users';
import type {
  ActivityViewerContextReader,
  ActivityViewerContext,
} from '@api/modules/activity';

@Injectable()
export class ActivityViewerContextAdapter implements ActivityViewerContextReader {
  constructor(
    @Inject(USER_ACTIVITY_CONTEXT_READER)
    private readonly users: UserActivityContextReader,
  ) {}

  async readForViewer(viewerId: string): Promise<ActivityViewerContext> {
    const context = await this.users.readForViewer(viewerId);
    return {
      interests: [...context.interests],
      followingIds: [...context.followingIds],
      blockedIds: [...context.blockedIds],
    };
  }
}
