export const DSS_QUEUE_NAMES = {
  INTEGRATION_EVENTS: "dss.integration-events",
  INTEGRATION_EVENTS_DEAD_LETTER: "dss.integration-events.dead-letter",
} as const;
export const DSS_JOB_NAMES = {
  DISPATCH_INTEGRATION_EVENT: "dispatch-integration-event.v1",
  DEAD_LETTER_INTEGRATION_EVENT: "dead-letter-integration-event.v1",
} as const;
export type IntegrationEventJob = {
  eventId: string;
  eventName: string;
  eventVersion: number;
  correlationId?: string;
  causationId?: string;
  category: string;
  producer: string;
  aggregateType?: string;
  aggregateId?: string;
  actorId?: string;
  payload: unknown;
  metadata?: unknown;
  occurredAt: string;
};

export type DeadLetterIntegrationEventJob = {
  event: IntegrationEventJob;
  sourceJobId?: string;
  reason: string;
  attempts: number;
  failedAt: string;
};

export type ProcessedEventStore = {
  hasProcessed(eventId: string, consumerName: string): Promise<boolean>;
  markProcessed(
    event: IntegrationEventJob,
    consumerName: string,
  ): Promise<void>;
};

export type IntegrationEventHandler = (
  event: IntegrationEventJob,
) => Promise<void>;

export class IdempotentIntegrationEventProcessor {
  constructor(
    private readonly consumerName: string,
    private readonly store: ProcessedEventStore,
    private readonly handler: IntegrationEventHandler,
  ) {}

  async process(
    data: IntegrationEventJob,
  ): Promise<{ eventId: string; duplicate: boolean }> {
    processIntegrationEvent(data);
    if (await this.store.hasProcessed(data.eventId, this.consumerName)) {
      return { eventId: data.eventId, duplicate: true };
    }
    await this.handler(data);
    await this.store.markProcessed(data, this.consumerName);
    return { eventId: data.eventId, duplicate: false };
  }
}

export function processIntegrationEvent(data: IntegrationEventJob): {
  eventId: string;
} {
  if (!data.eventId || data.eventVersion < 1)
    throw new Error("Invalid integration event job.");
  return { eventId: data.eventId };
}
