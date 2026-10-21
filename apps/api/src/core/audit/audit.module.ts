/** DSS File Passport — shared immutable audit infrastructure. */
import { Global, Module } from '@nestjs/common';
import { AuditRedactionService } from './services/audit-redaction.service';
import { AuditWriterService } from './services/audit-writer.service';

@Global()
@Module({
  providers: [AuditRedactionService, AuditWriterService],
  exports: [AuditRedactionService, AuditWriterService],
})
export class AuditModule {}
