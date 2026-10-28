/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Levels
 * 📄 File: apps/api/src/modules/levels/contracts/event-consumer.contract.ts
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

export interface LevelEventConsumer {
  consume(event: IntegrationEventJob): Promise<void>;
}

export const LEVEL_EVENT_CONSUMER = Symbol('LEVEL_EVENT_CONSUMER');
