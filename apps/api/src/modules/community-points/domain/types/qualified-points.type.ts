/** DSS Universe — Community Points qualified consumption.
 * Owner contracts: root attests producer facts; Points owns all economic policy.
 * No transport, persistence or foreign business types belong here.
 */
export type PointSourceScope = {
  producer: string;
  sourceKind: string;
  sourceId: string;
};

export type QualifiedPointEvent = {
  eventId: string;
  eventName: string;
  eventVersion: number;
  producer: string;
  sourceType: string | null;
  sourceId: string | null;
  actorId: string | null;
  occurredAt: string;
  value: number | null;
};

export type PointQualificationProjection = Omit<
  QualifiedPointEvent,
  'eventId' | 'producer'
> & { recipientId: string };

export type QualifiedPointFact = PointSourceScope & {
  factId: string;
  canonicalEventId: string;
  revision: string;
  action: 'QUALIFY' | 'WITHDRAW';
  qualificationId: string;
  qualificationRevision: string;
  qualificationEventId: string;
  qualificationFactId: string;
  retiredThroughRevision: string;
  predecessorWithdrawalFactId: string | null;
  contractVersion: 1;
  qualification: PointQualificationProjection;
};

export type PointFacet = 'CONTROL' | 'CONTRIBUTION';
export type QualifiedPointCommand = {
  contractVersion: 1;
  event: QualifiedPointEvent;
  recipientId: string;
  facts: readonly QualifiedPointFact[];
  contribution: { producer: string; factId: string } | null;
  facets: readonly PointFacet[];
};

export type PointFacetResult =
  | {
      facet: 'CONTROL';
      disposition: 'APPLIED' | 'NO_SOURCE_EFFECT';
      replayed: boolean;
    }
  | {
      facet: 'CONTRIBUTION';
      disposition: 'APPLIED' | 'NO_MATCH' | 'CAPPED' | 'SOURCE_REVOKED';
      replayed: boolean;
    };

export type QualifiedPointBlockCode =
  | 'INVALID_QUALIFICATION'
  | 'FACT_CONFLICT'
  | 'LEGACY_EVIDENCE_REQUIRED';
export type QualifiedPointOutcome =
  | { status: 'COMPLETE'; facets: readonly PointFacetResult[] }
  | { status: 'BLOCKED'; code: QualifiedPointBlockCode };
