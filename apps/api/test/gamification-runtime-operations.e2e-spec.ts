/** Real migrated operations. Synthetic seals prove bookkeeping, not producer authenticity. */
import { ConfigService } from '@nestjs/config';
import { AuditRedactionService, AuditWriterService } from '@api/core/audit';
import { PrismaPointRuleConfigurationReader } from '@api/modules/community-points/infrastructure';
import { PrismaAchievementRuleConfigurationReader } from '@api/modules/achievements/infrastructure';
import { ActivationPreflightAdapter } from '../src/composition/gamification-delivery/infrastructure/activation-preflight.adapter';
import { PrismaRuntimeOperations } from '../src/composition/gamification-delivery/infrastructure/prisma-runtime-operations';
import { PrismaRoutingPublicationRepository } from '../src/composition/gamification-delivery/infrastructure/prisma-routing-publication.repository';
import { createConsumptionFixture } from './helpers/gamification-consumption.fixture';

describe('Gamification operational retry and readiness', () => {
  let f: Awaited<ReturnType<typeof createConsumptionFixture>>;
  let audit: AuditWriterService;
  let operations: PrismaRuntimeOperations;
  let config: ConfigService;
  beforeAll(async () => {
    f = await createConsumptionFixture();
    audit = new AuditWriterService(new AuditRedactionService());
    config = new ConfigService({ DSS_GAMIFICATION_DEPLOYMENT_CONFIRMED: '1' });
    operations = new PrismaRuntimeOperations(
      f.prisma,
      audit,
      new ActivationPreflightAdapter(
        config,
        new PrismaPointRuleConfigurationReader(),
        new PrismaAchievementRuleConfigurationReader(),
      ),
    );
  }, 60000);
  afterEach(() => jest.restoreAllMocks());
  afterAll(async () => {
    await f?.close();
  });

  async function blocked() {
    const source = await f.add(4);
    const claim = await f.fixtureClaim(source.id);
    expect(await f.consumption.fail(claim, 'OWNER_FAILURE')).toBe('APPLIED');
    return { source, claim };
  }
  async function finish() {
    const [claim] = await f.consumption.claim(1);
    expect(claim).toBeDefined();
    expect(
      await f.consumption.completeOwner(claim, {
        owner: 'ACHIEVEMENTS',
        disposition: 'COMPLETE',
      }),
    ).toBe('APPLIED');
  }
  it('starts one audited epoch under concurrent retries without rewriting old history', async () => {
    const { source, claim } = await blocked();
    const before = await f.prisma.gamificationAdmission.findUniqueOrThrow({
      where: { id: source.id },
    });
    const attempts = await f.prisma.gamificationConsumptionAttempt.findMany({
      where: { admissionId: source.id },
      orderBy: { claimSequence: 'asc' },
    });
    await expect(f.prisma.$executeRaw`UPDATE gamification_consumption_receipts
      SET state='READY',epoch=epoch+1,"technicalFailures"=0,"blockCode"=NULL,"availableAt"=timezone('UTC',clock_timestamp())
      WHERE "admissionId"=${source.id}::uuid`).rejects.toThrow(
      'audited blocked retry',
    );
    const results = await Promise.allSettled([
      operations.retryConsumption(
        source.id,
        0n,
        'Reviewed synthetic failure',
        f.operator,
      ),
      operations.retryConsumption(
        source.id,
        0n,
        'Reviewed synthetic failure',
        f.operator,
      ),
    ]);
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      results.filter((result) => result.status === 'rejected'),
    ).toHaveLength(1);
    expect(
      await f.prisma.gamificationConsumptionReceipt.findUniqueOrThrow({
        where: { admissionId: source.id },
      }),
    ).toMatchObject({
      state: 'READY',
      epoch: 1n,
      technicalFailures: 0,
      pointsDone: true,
      levelsDone: true,
      achievementsDone: false,
    });
    expect(
      await f.prisma.gamificationAdmission.findUniqueOrThrow({
        where: { id: source.id },
      }),
    ).toEqual(before);
    expect(
      await f.prisma.gamificationConsumptionAttempt.findMany({
        where: { admissionId: source.id },
        orderBy: { claimSequence: 'asc' },
      }),
    ).toEqual(attempts);
    expect(
      await f.prisma.auditRecord.count({
        where: {
          action: 'gamification.consumption.retried',
          targetId: source.id,
        },
      }),
    ).toBe(1);
    expect(await f.consumption.load(claim)).toBeNull();
    expect(
      await f.consumption.completeOwner(claim, {
        owner: 'ACHIEVEMENTS',
        disposition: 'COMPLETE',
      }),
    ).toBe('STALE');
    expect(await operations.dueWakes()).toContainEqual({
      admissionId: source.id,
      epoch: '1',
      sequence: claim.sequence.toString(),
    });
    await finish();
  });
  it('rolls back retry if its audit cannot commit', async () => {
    const { source } = await blocked();
    const before =
      await f.prisma.gamificationConsumptionReceipt.findUniqueOrThrow({
        where: { admissionId: source.id },
      });
    const failure = new Error('synthetic operational audit failure');
    const append = jest.spyOn(audit, 'append').mockRejectedValue(failure);
    await expect(
      operations.retryConsumption(
        source.id,
        0n,
        'Synthetic reviewed failure',
        f.operator,
      ),
    ).rejects.toBe(failure);
    expect(
      await f.prisma.gamificationConsumptionReceipt.findUniqueOrThrow({
        where: { admissionId: source.id },
      }),
    ).toEqual(before);
    append.mockRestore();
    await operations.retryConsumption(
      source.id,
      0n,
      'Synthetic reviewed failure',
      f.operator,
    );
    await finish();
  });
  it('keeps pause authoritative for wake inventory and new claims', async () => {
    const source = await f.add();
    const state = await operations.state();
    const paused = await f.control.setPaused(true, f.operator, state!.revision);
    expect(await operations.dueWakes()).toEqual([]);
    expect(await f.consumption.claim(1)).toEqual([]);
    await f.control.setPaused(false, f.operator, paused.revision);
    expect(
      (await operations.dueWakes()).map((item) => item.admissionId),
    ).toContain(source.id);
    await finish();
  });
  it('retries only the blocked publication cycle and keeps all five failure records', async () => {
    const source = await f.add();
    const admission = await f.prisma.gamificationAdmission.findUniqueOrThrow({
      where: { id: source.id },
    });
    const publication = new PrismaRoutingPublicationRepository(f.prisma);
    for (let attempt = 1; attempt <= 5; attempt++) {
      const claim = (await publication.claim()).find(
        (row) => row.eventId === admission.eventId,
      );
      if (!claim) throw new Error('Expected synthetic publication claim.');
      expect(claim).toMatchObject({ cycle: 0, cycleAttempt: attempt });
      expect(await publication.fail(claim)).toBe(true);
      if (attempt < 5) {
        // Legal fixture eligibility change; not a claim that real backoff elapsed.
        await f.prisma.$executeRaw`UPDATE gamification_deliveries
          SET "availableAt"=timezone('UTC',clock_timestamp())-interval '1 second'
          WHERE "eventId"=${admission.eventId}::uuid AND destination='gamification.v1'`;
      }
    }
    const history = await f.prisma.gamificationPublicationFailure.findMany({
      where: { eventId: admission.eventId },
      orderBy: { cycleAttempt: 'asc' },
    });
    expect(history).toHaveLength(5);
    await operations.retryPublication(
      admission.eventId,
      0n,
      'Reviewed queue availability',
      f.operator,
    );
    expect(
      await f.prisma.gamificationPublicationFailure.findMany({
        where: { eventId: admission.eventId },
        orderBy: { cycleAttempt: 'asc' },
      }),
    ).toEqual(history);
    await expect(
      operations.retryPublication(
        admission.eventId,
        0n,
        'Stale reviewed request',
        f.operator,
      ),
    ).rejects.toThrow('STALE_RETRY');
    const claim = (await publication.claim()).find(
      (row) => row.eventId === admission.eventId,
    );
    if (!claim) throw new Error('Expected retried synthetic publication.');
    expect(claim).toMatchObject({ cycle: 1, cycleAttempt: 1 });
    expect(await publication.acknowledge(claim)).toBe(true);
    await finish();
  });
  it('requires explicit trusted deployment confirmation', async () => {
    const get = jest.spyOn(config, 'get').mockReturnValue('0');
    await expect(operations.preflight()).rejects.toThrow(
      'DEPLOYMENT_CONFIRMATION_REQUIRED',
    );
    get.mockRestore();
    await expect(operations.preflight()).resolves.toBeUndefined();
  });
  it('blocks unsupported enabled Point rules before activation readiness', async () => {
    const key = 'synthetic-unsupported-runtime';
    await f.prisma.communityPointRule.create({
      data: { key, eventName: 'synthetic.unsupported.v1', points: 1 },
    });
    await expect(operations.preflight()).rejects.toThrow(
      'UNREPRESENTED_POINT_CONFIGURATION',
    );
    await f.prisma.communityPointRule.update({
      where: { key },
      data: { enabled: false },
    });
    await expect(operations.preflight()).resolves.toBeUndefined();
  });
  it('checks enabled Achievement rules even on inactive definitions', async () => {
    const definition = await f.prisma.achievementDefinition.create({
      data: {
        key: 'synthetic-runtime',
        slug: 'synthetic-runtime',
        name: 'Synthetic',
        color: '#123456',
        badge: 'rocket',
        isActive: false,
        createdById: 'synthetic',
        updatedById: 'synthetic',
      },
    });
    const rule = await f.prisma.achievementRule.create({
      data: {
        achievementId: definition.id,
        eventName: 'reputation.direct.changed.v1',
        recipientPayloadKey: 'title',
        createdById: 'synthetic',
        updatedById: 'synthetic',
      },
    });
    await expect(operations.preflight()).rejects.toThrow(
      'UNREPRESENTED_ACHIEVEMENT_CONFIGURATION',
    );
    await f.prisma.achievementRule.update({
      where: { id: rule.id },
      data: { recipientPayloadKey: 'recipientId' },
    });
    await expect(operations.preflight()).resolves.toBeUndefined();
  });
});
