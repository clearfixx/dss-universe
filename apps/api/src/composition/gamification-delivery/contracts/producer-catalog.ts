/** Closed current producer catalogue; no future-module events are fabricated. */
export const PRODUCER_PROFILES = [
  {
    id: 'reputation.qualification',
    version: 2,
    producer: 'dss.api.reputation',
    category: 'integration',
    sourceType: 'ReputationEntry',
    events: ['reputation.direct.changed.v1', 'reputation.direct.reversed.v1'],
    recipients: ['recipientId'],
    points: true,
    levels: false,
  },
  {
    id: 'news.publication',
    version: 1,
    producer: 'dss.api.news',
    category: 'domain',
    sourceType: 'NewsArticle',
    events: ['news.article.published.v1'],
    recipients: ['authorId', 'actorId'],
    points: true,
    levels: false,
  },
  {
    id: 'comments.lifetime',
    version: 1,
    producer: 'dss.api.comments',
    category: 'integration',
    sourceType: 'Comment',
    events: ['comments.comment.created.v1', 'comments.comment.tombstoned.v1'],
    recipients: ['authorId'],
    points: true,
    levels: false,
  },
  {
    id: 'points.ledger',
    version: 1,
    producer: 'dss.api.community-points',
    category: 'integration',
    sourceType: 'CommunityPointEntry',
    events: ['community-points.awarded.v1', 'community-points.reversed.v1'],
    recipients: ['userId'],
    points: false,
    levels: true,
  },
] as const;

export type ProducerProfile = (typeof PRODUCER_PROFILES)[number];
export const ROUTING_ELIGIBLE_COORDINATES = Symbol(
  'ROUTING_ELIGIBLE_COORDINATES',
);
export const CURRENT_PRODUCER_COORDINATES = Object.freeze(
  PRODUCER_PROFILES.flatMap((profile) =>
    profile.events.map((eventName: string) =>
      Object.freeze({ producer: profile.producer, eventName }),
    ),
  ),
);

// Existing migration defaults for modules that do not yet emit these events.
// Their implementation must register producer evidence before enabling delivery.
export const DORMANT_POINT_EVENTS = [
  'community.topic.created.v1',
  'knowledge.article.published.v1',
] as const;

export function profileForEvent(
  eventName: string,
): ProducerProfile | undefined {
  return PRODUCER_PROFILES.find((profile) =>
    (profile.events as readonly string[]).includes(eventName),
  );
}
