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
  scanRequired: boolean;
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

export function isMediaProcessingJob(
  value: unknown,
): value is MediaProcessingJob {
  if (!isRecord(value)) return false;
  return (
    isNonEmptyString(value.mediaId) &&
    isNonEmptyString(value.uploadSessionId) &&
    isNonEmptyString(value.ownerId) &&
    isNonEmptyString(value.policyKey) &&
    isNonEmptyString(value.storageProvider) &&
    isNonEmptyString(value.bucket) &&
    isNonEmptyString(value.temporaryKey) &&
    isNonEmptyString(value.originalFilename) &&
    isNonEmptyString(value.mimeType) &&
    Number.isSafeInteger(value.size) &&
    typeof value.size === "number" &&
    value.size > 0 &&
    typeof value.checksum === "string" &&
    /^[a-f0-9]{64}$/.test(value.checksum) &&
    typeof value.scanRequired === "boolean" &&
    (value.processingKind === "IMAGE" ||
      value.processingKind === "PASSTHROUGH") &&
    isNonEmptyString(value.destinationKey) &&
    Array.isArray(value.variants) &&
    value.variants.every(isMediaProcessingVariantSpec) &&
    isNonEmptyString(value.queuedAt)
  );
}

function isMediaProcessingVariantSpec(
  value: unknown,
): value is MediaProcessingVariantSpec {
  if (!isRecord(value)) return false;
  return (
    isNonEmptyString(value.name) &&
    isNonEmptyString(value.storageKey) &&
    typeof value.width === "number" &&
    value.width > 0 &&
    (value.height === undefined ||
      (typeof value.height === "number" && value.height > 0)) &&
    (value.fit === "cover" || value.fit === "inside")
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}
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
