/**
 * DSS File Passport
 * File: apps/api/src/core/audit/services/audit-redaction.service.ts
 * Purpose: Removes secrets from audit metadata before persistence.
 */
import { Injectable } from '@nestjs/common';
import type { JsonValue } from '@api/core/events';

const SENSITIVE_KEY =
  /(password|secret|token|authorization|cookie|credential|hash)/i;

@Injectable()
export class AuditRedactionService {
  redact(value: JsonValue): JsonValue {
    if (Array.isArray(value)) return value.map((item) => this.redact(item));
    if (value !== null && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [
          key,
          SENSITIVE_KEY.test(key) ? '[REDACTED]' : this.redact(item),
        ]),
      );
    }
    return value;
  }
}
