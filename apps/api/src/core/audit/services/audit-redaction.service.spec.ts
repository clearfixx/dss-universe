import { AuditRedactionService } from './audit-redaction.service';

describe('AuditRedactionService', () => {
  it('redacts nested secrets while preserving useful context', () => {
    const service = new AuditRedactionService();
    expect(
      service.redact({
        email: 'crew@dss.test',
        credentials: { accessToken: 'secret', provider: 'local' },
      }),
    ).toEqual({
      email: 'crew@dss.test',
      credentials: '[REDACTED]',
    });
  });
});
