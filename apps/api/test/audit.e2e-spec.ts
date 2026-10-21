import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { AuditWriterService } from '../src/core/audit';
import { PrismaService } from '../src/core/database';
import { PermissionsService } from '../src/modules/iam/permissions';

describe('Audit Platform (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let audit: AuditWriterService;
  let permissions: PermissionsService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    audit = app.get(AuditWriterService);
    permissions = app.get(PermissionsService);
  });

  it('audits a sensitive IAM action in the same transaction', async () => {
    const key = `audit.test.${Date.now()}`;
    const permission = await permissions.create(
      { key, label: 'Audit integration proof' },
      'audit-actor',
    );
    await expect(
      prisma.auditRecord.findFirst({
        where: { action: 'iam.permission.created', targetId: permission.id },
      }),
    ).resolves.toMatchObject({ actorId: 'audit-actor', result: 'SUCCESS' });
    await prisma.auditRecord.deleteMany({ where: { targetId: permission.id } });
    await prisma.permission.delete({ where: { id: permission.id } });
  });

  it('rolls audit back with its owning transaction and redacts secrets', async () => {
    await expect(
      prisma.transaction(async (transaction) => {
        await audit.append(transaction, {
          action: 'audit.rollback.proof',
          actorType: 'SYSTEM',
          metadata: { accessToken: 'must-not-persist' },
        });
        throw new Error('force audit rollback');
      }),
    ).rejects.toThrow('force audit rollback');
    await expect(
      prisma.auditRecord.count({ where: { action: 'audit.rollback.proof' } }),
    ).resolves.toBe(0);

    const id = await prisma.transaction((transaction) =>
      audit.append(transaction, {
        action: 'audit.redaction.proof',
        actorType: 'SYSTEM',
        metadata: { accessToken: 'secret', safe: 'context' },
      }),
    );
    await expect(
      prisma.auditRecord.findUnique({ where: { id } }),
    ).resolves.toMatchObject({
      metadata: { accessToken: '[REDACTED]', safe: 'context' },
    });
    await prisma.auditRecord.delete({ where: { id } });
  });

  afterAll(async () => app.close());
});
