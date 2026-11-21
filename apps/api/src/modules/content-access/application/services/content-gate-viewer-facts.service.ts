/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Content Access
 * 📄 File: apps/api/src/modules/content-access/application/services/content-gate-viewer-facts.service.ts
 *
 * 🎯 Purpose:
 * Composes owned gate statistics from minimal owner-evidence input ports.
 *
 * 🧠 Responsibilities:
 * • rejects missing or inactive accounts before reading counts;
 * • computes clamped account age and preserves explicit future-ledger placeholders.
 *
 * 🏗️ Architecture:
 * Content Access application service; no sibling repository or ORM row is consumed.
 *
 * ⚠️ Important:
 * Groups and Premium come exclusively from Authorization; failures must propagate.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Inject, Injectable } from '@nestjs/common';
import type { ContentGateViewerFacts } from '../../domain/types/content-gate.type';
import {
  GATE_ACCOUNT_EVIDENCE,
  type GateAccountEvidenceReader,
} from '../../domain/ports/gate-account-evidence.interface';
import {
  GATE_COMMENT_COUNT,
  type GateCommentCountReader,
} from '../../domain/ports/gate-comment-count.interface';
import {
  GATE_REPUTATION_TOTAL,
  type GateReputationTotalReader,
} from '../../domain/ports/gate-reputation-total.interface';
import {
  GATE_FORUM_POST_COUNT,
  type GateForumPostCountReader,
} from '../../domain/ports/gate-forum-post-count.interface';
import {
  GATE_VIEWER_RESTRICTION,
  type GateViewerRestrictionReader,
} from '../../domain/ports/gate-viewer-restriction.interface';
@Injectable()
export class ContentGateViewerFactsService {
  constructor(
    @Inject(GATE_ACCOUNT_EVIDENCE)
    private readonly accounts: GateAccountEvidenceReader,
    @Inject(GATE_COMMENT_COUNT)
    private readonly comments: GateCommentCountReader,
    @Inject(GATE_REPUTATION_TOTAL)
    private readonly reputation: GateReputationTotalReader,
    @Inject(GATE_VIEWER_RESTRICTION)
    private readonly restriction: GateViewerRestrictionReader,
    @Inject(GATE_FORUM_POST_COUNT)
    private readonly forumPosts: GateForumPostCountReader,
  ) {}
  async read(
    subjectId: string,
    now: Date,
  ): Promise<Omit<ContentGateViewerFacts, 'groups'> | null> {
    const account = await this.accounts.find(subjectId);
    if (!account || !account.active) return null;
    const [comments, reputation, readOnly, forumPosts] = await Promise.all([
      this.comments.countByAuthor(subjectId),
      this.reputation.totalFor(subjectId),
      this.restriction.isReadOnly(subjectId, now),
      this.forumPosts.countByAuthor(subjectId),
    ]);
    return {
      accountAgeDays: Math.max(
        0,
        Math.floor((now.getTime() - account.createdAt.getTime()) / 86_400_000),
      ),
      comments,
      forumPosts,
      // Explicit placeholder until a publishing ledger docks here.
      publications: 0,
      reputation,
      readOnly,
    };
  }
}
