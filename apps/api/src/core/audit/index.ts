/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Core Audit
 * 📄 File: apps/api/src/core/audit/index.ts
 *
 * 🎯 Purpose:
 * Publishes the existing technical audit writer, redactor and entry types by name.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export { AuditModule } from './audit.module';
export { AuditRedactionService } from './services/audit-redaction.service';
export { AuditWriterService } from './services/audit-writer.service';
export type {
  AuditActorType,
  AuditResult,
  AuditEntry,
} from './types/audit-entry.type';
