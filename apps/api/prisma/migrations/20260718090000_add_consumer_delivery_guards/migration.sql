CREATE TABLE "processed_events" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "consumerName" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "eventVersion" INTEGER NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "processed_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "dead_letter_events" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "sourceJobId" TEXT,
    "eventName" TEXT NOT NULL,
    "eventVersion" INTEGER NOT NULL,
    "consumerName" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "attempts" INTEGER NOT NULL,
    "failedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "dead_letter_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "processed_events_eventId_consumerName_key"
ON "processed_events"("eventId", "consumerName");
CREATE INDEX "processed_events_consumerName_processedAt_idx"
ON "processed_events"("consumerName", "processedAt");
CREATE INDEX "dead_letter_events_eventId_idx" ON "dead_letter_events"("eventId");
CREATE INDEX "dead_letter_events_resolvedAt_failedAt_idx"
ON "dead_letter_events"("resolvedAt", "failedAt");
