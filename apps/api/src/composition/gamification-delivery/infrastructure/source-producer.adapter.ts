/** Root attestation of current one-way source lifetimes. Owner readers supply
 * state/phase; canonical producer IDs supply fact identity, never consumer UUIDs.
 */
import { Injectable } from '@nestjs/common';
import type { TransactionClient } from '@api/core/database';
import {
  CanonicalOutboxReader,
  type CanonicalOutboxEvidence,
} from '@api/core/events/infrastructure';
import { PrismaPublicationEvidenceReader } from '@api/modules/news/infrastructure';
import { PrismaCommentLifetimeReader } from '@api/modules/interactions/infrastructure';
import { PrismaPointLedgerEvidenceReader } from '@api/modules/community-points/infrastructure';
import { PrismaForumContributionReader } from '@api/modules/forum/infrastructure';
import type {
  QualifiedAchievementCommand,
  QualifiedAchievementFact,
} from '@api/modules/achievements';
import type {
  QualifiedPointCommand,
  QualifiedPointFact,
} from '@api/modules/community-points';
import type { AdmissionRejectionCode } from '../contracts/consumption.types';
import type { SourceAdmissionSeal } from '../contracts/admission-seal.types';
import type { SourcePointProfileId } from '../contracts/admission-seal.types';
import { profileForEvent } from '../contracts/producer-catalog';

type Canonical = CanonicalOutboxEvidence;
export type PreparedSourceSeal =
  | { status: 'READY'; seal: SourceAdmissionSeal }
  | { status: 'BLOCKED'; code: AdmissionRejectionCode };
const missing = (): PreparedSourceSeal => ({
  status: 'BLOCKED',
  code: 'PRODUCER_EVIDENCE_MISSING',
});
const mismatch = (): PreparedSourceSeal => ({
  status: 'BLOCKED',
  code: 'CANONICAL_EVIDENCE_MISMATCH',
});
const commentKeys = [
  'commentId',
  'interactionTargetId',
  'authorId',
  'parentId',
] as const;
const pointKeys = [
  'userId',
  'ruleKey',
  'points',
  'sourceType',
  'sourceId',
] as const;
const forumKeys = ['targetId', 'authorId', 'postId', 'topicId'] as const;
const FORUM_SOURCES = {
  'forum.topics': {
    sourceType: 'ForumTopic',
    eventName: 'forum.topic.created.v1',
  },
  'forum.replies': {
    sourceType: 'ForumPost',
    eventName: 'forum.post.created.v1',
  },
  'forum.answers': {
    sourceType: 'ForumAnswerCredit',
    eventName: 'forum.answer.credited.v1',
  },
} as const;
type ForumProfileId = keyof typeof FORUM_SOURCES;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function header(e: Canonical) {
  return {
    eventId: e.eventId,
    eventName: e.name,
    eventVersion: e.version,
    producer: e.producer,
    sourceType: e.aggregateType,
    sourceId: e.aggregateId,
    occurredAt: e.occurredAt,
  };
}
function valid(e: Canonical | null): e is Canonical {
  if (!e?.payload) return false;
  const p = profileForEvent(e.name);
  return (
    !!p &&
    e.version === 1 &&
    e.producer === p.producer &&
    e.category === p.category &&
    e.aggregateType === p.sourceType &&
    typeof e.aggregateId === 'string'
  );
}
function fact(
  e: Canonical,
  sourceKind: string,
  sourceId: string,
  qualifying: Canonical,
  revision: '1' | '2',
  action: 'QUALIFY' | 'WITHDRAW',
  factId = e.eventId,
  qualificationFactId = qualifying.eventId,
): QualifiedAchievementFact {
  return {
    producer: e.producer,
    sourceKind,
    sourceId,
    factId,
    canonicalEventId: e.eventId,
    revision,
    action,
    qualificationId: qualificationFactId,
    qualificationRevision: '1',
    qualificationEventId: qualifying.eventId,
    qualificationFactId,
    retiredThroughRevision: action === 'WITHDRAW' ? '1' : '0',
    predecessorWithdrawalFactId: null,
    contractVersion: 1,
  };
}

@Injectable()
export class SourceProducerAdapter {
  constructor(
    private readonly canonical: CanonicalOutboxReader,
    private readonly news: PrismaPublicationEvidenceReader,
    private readonly comments: PrismaCommentLifetimeReader,
    private readonly points: PrismaPointLedgerEvidenceReader,
    private readonly forum: PrismaForumContributionReader,
  ) {}

  async prepare(
    transaction: TransactionClient,
    eventId: string,
  ): Promise<PreparedSourceSeal> {
    const event = await this.canonical.readSelected(transaction, eventId, []);
    if (!event)
      return { status: 'BLOCKED', code: 'CANONICAL_EVIDENCE_MISSING' };
    const p = profileForEvent(event.name);
    if (!p) return { status: 'BLOCKED', code: 'UNSUPPORTED_DESCRIPTOR' };
    if (p.id === 'news.publication')
      return this.publication(transaction, eventId);
    if (p.id === 'comments.lifetime') return this.comment(transaction, eventId);
    if (p.id === 'points.ledger') return this.ledger(transaction, eventId);
    if (Object.hasOwn(FORUM_SOURCES, p.id))
      return this.forumContribution(
        transaction,
        eventId,
        p.id as ForumProfileId,
      );
    return { status: 'BLOCKED', code: 'UNSUPPORTED_DESCRIPTOR' };
  }

  private withPoints(
    id: SourcePointProfileId,
    event: Canonical,
    recipientId: string,
    actors: Readonly<Record<string, string>>,
    facts: readonly QualifiedAchievementFact[],
    contribution: QualifiedAchievementFact,
    evidence: ReadonlyMap<string, Canonical>,
  ): PreparedSourceSeal {
    const pointFacts: QualifiedPointFact[] = [];
    for (const f of facts) {
      const q = facts.find(
        (item) =>
          item.factId === f.qualificationFactId && item.action === 'QUALIFY',
      );
      const original = q && evidence.get(q.canonicalEventId);
      if (!original) return missing();
      pointFacts.push({
        ...f,
        qualification: {
          eventName: original.name,
          eventVersion: original.version,
          sourceType: original.aggregateType,
          sourceId: original.aggregateId,
          actorId: original.actorId,
          occurredAt: original.occurredAt,
          value: null,
          recipientId,
        },
      });
    }
    const points: QualifiedPointCommand = {
      contractVersion: 1,
      event: { ...header(event), actorId: event.actorId, value: null },
      recipientId,
      facts: pointFacts,
      contribution: {
        producer: contribution.producer,
        factId: contribution.factId,
      },
      facets: facts.some((f) => f.action === 'WITHDRAW')
        ? ['CONTROL', 'CONTRIBUTION']
        : ['CONTRIBUTION'],
    };
    const achievements: QualifiedAchievementCommand = {
      event: { ...header(event), payload: actors },
      facts,
      contribution: {
        producer: contribution.producer,
        factId: contribution.factId,
      },
    };
    return {
      status: 'READY',
      seal: {
        codecVersion: 2,
        destination: 'gamification.v1',
        descriptor: { id, version: 1 },
        canonical: header(event),
        applicability: { POINTS: true, LEVELS: false, ACHIEVEMENTS: true },
        inputs: {
          POINTS: { codec: 'points.qualified.v1', command: points },
          ACHIEVEMENTS: {
            codec: 'achievements.qualified.v1',
            command: achievements,
          },
        },
      },
    };
  }

  private async publication(
    tx: TransactionClient,
    eventId: string,
  ): Promise<PreparedSourceSeal> {
    const e = await this.canonical.readSelected(tx, eventId, [
      'articleId',
      'authorId',
      'actorId',
      'action',
      'status',
      'revisionVersion',
      'decisionId',
    ]);
    if (!valid(e) || e.name !== 'news.article.published.v1') return mismatch();
    const p = e.payload!;
    if (typeof p.decisionId !== 'string' || p.articleId !== e.aggregateId)
      return mismatch();
    const owned = await this.news.read(tx, e.aggregateId!, p.decisionId);
    if (!owned) return missing();
    if (
      p.authorId !== owned.authorId ||
      p.actorId !== owned.actorId ||
      e.actorId !== owned.actorId ||
      p.revisionVersion !== owned.revisionVersion ||
      p.action !== 'PUBLISHED' ||
      p.status !== 'PUBLISHED'
    )
      return mismatch();
    const q = fact(
      e,
      'NewsArticle',
      owned.articleId,
      e,
      owned.qualificationRevision,
      'QUALIFY',
    );
    return this.withPoints(
      'news.publication',
      e,
      owned.authorId,
      { authorId: owned.authorId, actorId: owned.actorId },
      [q],
      q,
      new Map([[e.eventId, e]]),
    );
  }

  private async eventContributionId(
    tx: TransactionClient,
    e: Canonical,
  ): Promise<string | null> {
    const metadata = await this.canonical.metadataSelected(tx, e.eventId, [
      'qualificationContractVersion',
      'contributionFactId',
    ]);
    return metadata?.qualificationContractVersion === 1 &&
      typeof metadata.contributionFactId === 'string' &&
      uuid.test(metadata.contributionFactId)
      ? metadata.contributionFactId
      : null;
  }

  private async comment(
    tx: TransactionClient,
    eventId: string,
  ): Promise<PreparedSourceSeal> {
    const e = await this.canonical.readSelected(tx, eventId, commentKeys);
    if (!valid(e) || !e.name.startsWith('comments.comment.')) return mismatch();
    const owned = await this.comments.read(tx, e.aggregateId!);
    if (!owned) return missing();
    const matches = (candidate: Canonical): boolean =>
      valid(candidate) &&
      candidate.producer === e.producer &&
      candidate.aggregateId === owned.id &&
      candidate.payload!.commentId === owned.id &&
      candidate.payload!.authorId === owned.authorId &&
      candidate.payload!.interactionTargetId === owned.interactionTargetId &&
      candidate.payload!.parentId === owned.parentId;
    const coordinate = {
      producer: e.producer,
      aggregateType: 'Comment',
      aggregateId: owned.id,
    };
    const created = await this.canonical.candidatesSelected(
      tx,
      { ...coordinate, eventName: 'comments.comment.created.v1' },
      commentKeys,
    );
    if (created.length !== 1) return missing();
    const qEvent = created[0];
    if (!matches(e) || !matches(qEvent) || qEvent.actorId !== owned.authorId)
      return mismatch();
    const q = fact(
      qEvent,
      'Comment',
      owned.id,
      qEvent,
      owned.qualificationRevision,
      'QUALIFY',
    );
    const facts = [q];
    const evidence = new Map([[qEvent.eventId, qEvent]]);
    let contribution = q;
    if (owned.deletedAt !== null) {
      const withdrawn = await this.canonical.candidatesSelected(
        tx,
        { ...coordinate, eventName: 'comments.comment.tombstoned.v1' },
        commentKeys,
      );
      if (withdrawn.length !== 1) return missing();
      const wEvent = withdrawn[0];
      if (!matches(wEvent) || wEvent.actorId !== owned.deletedById)
        return mismatch();
      facts.push(
        fact(
          wEvent,
          'Comment',
          owned.id,
          qEvent,
          owned.withdrawalRevision,
          'WITHDRAW',
        ),
      );
      evidence.set(wEvent.eventId, wEvent);
      if (e.name === 'comments.comment.tombstoned.v1') {
        if (wEvent.eventId !== e.eventId) return mismatch();
        const eventFact = await this.eventContributionId(tx, e);
        if (!eventFact) return missing();
        contribution = fact(
          e,
          '@event',
          e.eventId,
          e,
          owned.qualificationRevision,
          'QUALIFY',
          eventFact,
          eventFact,
        );
        facts.push(contribution);
      }
    } else if (e.name !== 'comments.comment.created.v1') return mismatch();
    if (
      e.name === 'comments.comment.created.v1' &&
      e.eventId !== qEvent.eventId
    )
      return mismatch();
    return this.withPoints(
      'comments.lifetime',
      e,
      owned.authorId,
      { authorId: owned.authorId },
      facts,
      contribution,
      evidence,
    );
  }

  /**
   * Forum contributions are one-way: exactly one canonical creation event per
   * source, QUALIFY at revision 1 and never WITHDRAW (points are not revoked on
   * deletion). Topic and post identity survive moves, merges and splits.
   */
  private async forumContribution(
    tx: TransactionClient,
    eventId: string,
    id: ForumProfileId,
  ): Promise<PreparedSourceSeal> {
    const source = FORUM_SOURCES[id];
    const e = await this.canonical.readSelected(tx, eventId, forumKeys);
    if (!valid(e) || e.name !== source.eventName) return mismatch();
    const sourceId = e.aggregateId!;
    let authorId: string;
    let actorId: string;
    let revision: '1';
    if (id === 'forum.topics') {
      const owned = await this.forum.topic(tx, sourceId);
      if (!owned) return missing();
      ({ authorId } = owned);
      actorId = owned.authorId;
      revision = owned.qualificationRevision;
    } else {
      const owned = await this.forum.post(tx, sourceId);
      if (!owned) return missing();
      authorId = owned.authorId;
      revision = owned.qualificationRevision;
      if (id === 'forum.replies') {
        // Post #1 belongs to topic creation and never earns reply points.
        if (owned.number === 1) return mismatch();
        actorId = owned.authorId;
      } else {
        if (!owned.firstAcceptedById) return missing();
        // Nobody earns the answer bonus by accepting their own post.
        if (owned.firstAcceptedById === owned.authorId) return mismatch();
        actorId = owned.firstAcceptedById;
      }
    }
    const candidates = await this.canonical.candidatesSelected(
      tx,
      {
        producer: e.producer,
        aggregateType: source.sourceType,
        aggregateId: sourceId,
        eventName: source.eventName,
      },
      forumKeys,
    );
    if (candidates.length !== 1) return missing();
    const created = candidates[0];
    if (
      created.eventId !== e.eventId ||
      !valid(created) ||
      created.payload!.targetId !== sourceId ||
      created.payload!.authorId !== authorId ||
      created.actorId !== actorId ||
      (id === 'forum.answers' && created.payload!.postId !== sourceId)
    )
      return mismatch();
    const q = fact(
      created,
      source.sourceType,
      sourceId,
      created,
      revision,
      'QUALIFY',
    );
    return this.withPoints(
      id,
      created,
      authorId,
      { authorId },
      [q],
      q,
      new Map([[created.eventId, created]]),
    );
  }

  private async ledger(
    tx: TransactionClient,
    eventId: string,
  ): Promise<PreparedSourceSeal> {
    const e = await this.canonical.readSelected(tx, eventId, pointKeys);
    if (!valid(e) || !e.name.startsWith('community-points.')) return mismatch();
    const owned = await this.points.read(tx, e.aggregateId!);
    if (!owned) return missing();
    type Entry = typeof owned.entry;
    const matches = (candidate: Canonical, row: Entry, name: string): boolean =>
      valid(candidate) &&
      candidate.producer === e.producer &&
      candidate.name === name &&
      candidate.aggregateId === row.id &&
      candidate.actorId === row.actorId &&
      candidate.payload!.userId === row.userId &&
      candidate.payload!.ruleKey === row.ruleKey &&
      candidate.payload!.points === row.points &&
      (candidate.payload!.sourceType ?? null) === row.sourceType &&
      (candidate.payload!.sourceId ?? null) === row.sourceId;
    if (
      !matches(
        e,
        owned.entry,
        owned.entry.reversesEntryId
          ? 'community-points.reversed.v1'
          : 'community-points.awarded.v1',
      )
    )
      return mismatch();
    const qEvents = await this.canonical.candidatesSelected(
      tx,
      {
        producer: e.producer,
        aggregateType: 'CommunityPointEntry',
        aggregateId: owned.original.id,
        eventName: 'community-points.awarded.v1',
      },
      pointKeys,
    );
    if (qEvents.length !== 1) return missing();
    const qEvent = qEvents[0];
    if (!matches(qEvent, owned.original, 'community-points.awarded.v1'))
      return mismatch();
    const q = fact(
      qEvent,
      'CommunityPointEntry',
      owned.original.id,
      qEvent,
      owned.qualificationRevision,
      'QUALIFY',
    );
    const facts = [q];
    let contribution = q;
    if (owned.reversal) {
      const withdrawn = await this.canonical.candidatesSelected(
        tx,
        {
          producer: e.producer,
          aggregateType: 'CommunityPointEntry',
          aggregateId: owned.reversal.id,
          eventName: 'community-points.reversed.v1',
        },
        pointKeys,
      );
      if (withdrawn.length !== 1) return missing();
      const wEvent = withdrawn[0];
      if (!matches(wEvent, owned.reversal, 'community-points.reversed.v1'))
        return mismatch();
      facts.push(
        fact(
          wEvent,
          'CommunityPointEntry',
          owned.original.id,
          qEvent,
          owned.withdrawalRevision,
          'WITHDRAW',
        ),
      );
      if (e.name === 'community-points.reversed.v1') {
        if (wEvent.eventId !== e.eventId) return mismatch();
        const eventFact = await this.eventContributionId(tx, e);
        if (!eventFact) return missing();
        contribution = fact(
          e,
          '@event',
          e.eventId,
          e,
          owned.qualificationRevision,
          'QUALIFY',
          eventFact,
          eventFact,
        );
        facts.push(contribution);
      }
    }
    const command: QualifiedAchievementCommand = {
      event: { ...header(e), payload: { userId: owned.entry.userId } },
      facts,
      contribution: {
        producer: contribution.producer,
        factId: contribution.factId,
      },
    };
    return {
      status: 'READY',
      seal: {
        codecVersion: 2,
        destination: 'gamification.v1',
        descriptor: { id: 'points.ledger', version: 1 },
        canonical: header(e),
        applicability: { POINTS: false, LEVELS: true, ACHIEVEMENTS: true },
        inputs: {
          LEVELS: {
            codec: 'levels.event.v1',
            command: { ...header(e), userId: owned.entry.userId },
          },
          ACHIEVEMENTS: { codec: 'achievements.qualified.v1', command },
        },
      },
    };
  }
}
