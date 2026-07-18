/**
 * DSS File Passport
 * File: apps/api/src/core/audit/types/audit-entry.type.ts
 * Purpose: Defines the transport-neutral audit entry contract.
 */
import type { JsonValue } from '@api/core/events';

export type AuditActorType = 'USER' | 'SYSTEM' | 'SERVICE';
export type AuditResult = 'SUCCESS' | 'FAILURE' | 'DENIED';
export type AuditEntry = {
  action: string;
  actorType: AuditActorType;
  actorId?: string;
  targetType?: string;
  targetId?: string;
  result?: AuditResult;
  reason?: string;
  correlationId?: string;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: JsonValue;
  occurredAt?: string;
};
