/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Community Points
 * 📄 File: apps/api/src/modules/community-points/contracts/event-consumer.contract.ts
 *
 * 🎯 Purpose:
 * Publishes one event-consumption command without exposing mutable owner services.
 *
 * 🧠 Responsibilities:
 * • publishes only the existing event-consumption command;
 * • keeps mutable services and persistence outside the capability.
 *
 * 🏗️ Architecture:
 * Owner-owned input capability over the existing integration envelope.
 *
 * ⚠️ Important:
 * Completion includes owned no-ops; errors propagate and no effect count is promised.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { IntegrationEventJob } from '@dss/jobs';

export interface CommunityPointsEventConsumer {
  consume(event: IntegrationEventJob): Promise<void>;
}

export const COMMUNITY_POINTS_EVENT_CONSUMER = Symbol(
  'COMMUNITY_POINTS_EVENT_CONSUMER',
);
