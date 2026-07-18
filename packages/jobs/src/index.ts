export const DSS_QUEUE_NAMES = {
  INTEGRATION_EVENTS: "dss.integration-events",
} as const;
export const DSS_JOB_NAMES = {
  DISPATCH_INTEGRATION_EVENT: "dispatch-integration-event.v1",
} as const;
export type IntegrationEventJob = {
  eventId: string;
  eventName: string;
  eventVersion: number;
  correlationId?: string;
  causationId?: string;
};

export function processIntegrationEvent(data: IntegrationEventJob): {
  eventId: string;
} {
  if (!data.eventId || data.eventVersion < 1)
    throw new Error("Invalid integration event job.");
  return { eventId: data.eventId };
}
