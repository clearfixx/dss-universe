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
@Injectable()
export class ContentGateViewerFactsService {
  constructor(
    @Inject(GATE_ACCOUNT_EVIDENCE)
    private readonly accounts: GateAccountEvidenceReader,
    @Inject(GATE_COMMENT_COUNT)
    private readonly comments: GateCommentCountReader,
    @Inject(GATE_REPUTATION_TOTAL)
    private readonly reputation: GateReputationTotalReader,
  ) {}
  async read(
    subjectId: string,
    now: Date,
  ): Promise<Omit<ContentGateViewerFacts, 'groups'> | null> {
    const account = await this.accounts.find(subjectId);
    if (!account || !account.active) return null;
    const [comments, reputation] = await Promise.all([
      this.comments.countByAuthor(subjectId),
      this.reputation.totalFor(subjectId),
    ]);
    return {
      accountAgeDays: Math.max(
        0,
        Math.floor((now.getTime() - account.createdAt.getTime()) / 86_400_000),
      ),
      comments,
      // Explicit existing placeholders until the Forum/publishing ledgers dock here.
      forumPosts: 0,
      publications: 0,
      reputation,
    };
  }
}
