export const DSS_QUEUE_NAMES = {
  INTEGRATION_EVENTS: "dss.integration-events",
  INTEGRATION_EVENTS_DEAD_LETTER: "dss.integration-events.dead-letter",
  MEDIA_PROCESSING: "dss.media-processing",
} as const;
export const DSS_JOB_NAMES = {
  DISPATCH_INTEGRATION_EVENT: "dispatch-integration-event.v1",
  DEAD_LETTER_INTEGRATION_EVENT: "dead-letter-integration-event.v1",
  PROCESS_MEDIA_UPLOAD: "process-media-upload.v1",
} as const;

export type MediaProcessingJob = {
  mediaId: string;
  uploadSessionId: string;
  ownerId: string;
  policyKey: string;
  storageProvider: string;
  bucket: string;
  temporaryKey: string;
  originalFilename: string;
  mimeType: string;
  size: number;
  checksum: string;
  processingKind: "IMAGE" | "PASSTHROUGH";
  destinationKey: string;
  variants: MediaProcessingVariantSpec[];
  queuedAt: string;
};

export type MediaProcessingVariantSpec = {
  name: string;
  storageKey: string;
  width: number;
  height?: number;
  fit: "cover" | "inside";
};
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
