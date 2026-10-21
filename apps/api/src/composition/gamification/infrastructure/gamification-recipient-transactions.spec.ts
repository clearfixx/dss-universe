/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Gamification Transaction Tests
 * 📄 File: apps/api/src/composition/gamification/infrastructure/gamification-recipient-transactions.spec.ts
 *
 * 🎯 Purpose:
 * Pins owner write stages, evidence reuse and same-client root composition.
 *
 * 🧠 Responsibilities:
 * • verifies parallel reads, result precedence and failure propagation;
 * • verifies ID-only reads and command delegation without ORM business APIs.
 *
 * 🏗️ Architecture:
 * Pure adapter tests; migrated E2E separately proves actual atomicity and locks.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { TransactionClient, PrismaService } from '@api/core/database';
import type { AuditWriterService } from '@api/core/audit';
import type { OutboxWriterService } from '@api/core/events';
import { PrismaManualAwardWriter } from '@api/modules/achievements/infrastructure';
import { PrismaTitleGrantWriter } from '@api/modules/custom-titles/infrastructure';
import { PrismaTransactionalProfileExistenceReader } from '@api/modules/users/infrastructure';
import { PrismaManualAwardTransaction } from './prisma-manual-award.transaction';
import { PrismaTitleGrantTransaction } from './prisma-title-grant.transaction';
import { AchievementEvidenceWriter } from '../../../modules/achievements/infrastructure/repositories/achievement-evidence.writer';
import type { AwardRow } from '../../../modules/achievements/infrastructure/repositories/achievement-award.shape';
import {
  toTitleGrant,
  type GrantRow,
} from '../../../modules/custom-titles/infrastructure/repositories/title-grant.shape';
import { PrismaAchievementsRepository } from '../../../modules/achievements/infrastructure/repositories/prisma-achievements.repository';
import { PrismaCustomTitlesRepository } from '../../../modules/custom-titles/infrastructure/repositories/prisma-custom-titles.repository';

const input = {
  userId: 'recipient',
  achievementId: 'definition',
  titleId: 'definition',
  reason: 'Synthetic reason',
  actorId: 'actor',
};
const award = {
  id: 'award',
  userId: input.userId,
  achievementId: input.achievementId,
  kind: 'MANUAL',
  sourceType: null,
  sourceId: null,
} as AwardRow;
const titleGrant = {
  id: 'grant',
  userId: input.userId,
  titleId: input.titleId,
  grantedById: input.actorId,
  grantReason: input.reason,
  grantedAt: new Date(0),
  revokedAt: null,
  revokedById: null,
  revokeReason: null,
  title: { id: 'definition' },
  selection: null,
} as GrantRow;

for (const kind of ['award', 'title'] as const) {
  describe(`Owned ${kind} writer`, () => {
    function harness() {
      const definition = jest.fn().mockResolvedValue({ id: 'definition' });
      const existing = jest.fn().mockResolvedValue(null);
      const create = jest
        .fn()
        .mockResolvedValue(kind === 'award' ? award : titleGrant);
      const lock = jest.fn().mockResolvedValue(1);
      const transaction = {
        $executeRaw: lock,
        achievementDefinition: { findFirst: definition },
        achievementAward: { findFirst: existing, create },
        customTitle: { findFirst: definition },
        userTitleGrant: { findFirst: existing, create },
      } as unknown as TransactionClient;
      const audit = jest
        .fn<Promise<string>, Parameters<AuditWriterService['append']>>()
        .mockResolvedValue('audit');
      const outbox = jest
        .fn<Promise<string>, Parameters<OutboxWriterService['append']>>()
        .mockResolvedValue('outbox');
      const auditWriter = { append: audit } as unknown as AuditWriterService;
      const outboxWriter = { append: outbox } as unknown as OutboxWriterService;
      const recipient = jest.fn<Promise<boolean>, []>().mockResolvedValue(true);
      const writer =
        kind === 'award'
          ? new PrismaManualAwardWriter(auditWriter, outboxWriter)
          : new PrismaTitleGrantWriter(auditWriter, outboxWriter);
      const write = () =>
        writer instanceof PrismaManualAwardWriter
          ? writer.award(transaction, input, recipient)
          : writer.grant(transaction, input, recipient);
      return {
        definition,
        existing,
        create,
        lock,
        transaction,
        audit,
        outbox,
        recipient,
        write,
      };
    }
    it('retains the pair key, active owned definition, non-revoked conflict and projection', async () => {
      const h = harness();
      expect(await h.write()).toEqual(
        kind === 'award'
          ? { status: 'OK', award }
          : { status: 'OK', grant: toTitleGrant(titleGrant) },
      );
      expect(h.lock).toHaveBeenCalledWith(
        expect.any(Array),
        `${kind === 'award' ? 'achievements:award' : 'custom-titles:grant'}:recipient:definition`,
      );
      expect(h.definition).toHaveBeenCalledWith({
        where: { id: 'definition', isActive: true },
        select: { id: true },
      });
      expect(h.existing).toHaveBeenCalledWith({
        where:
          kind === 'award'
            ? {
                userId: 'recipient',
                achievementId: 'definition',
                revocation: null,
              }
            : { userId: 'recipient', titleId: 'definition', revokedAt: null },
        select: { id: true },
      });
      expect(h.create).toHaveBeenCalledWith(
        kind === 'award'
          ? {
              data: {
                userId: input.userId,
                achievementId: input.achievementId,
                kind: 'MANUAL',
                reason: input.reason,
                awardedById: input.actorId,
              },
              include: { achievement: true, revocation: true },
            }
          : {
              data: {
                userId: input.userId,
                titleId: input.titleId,
                grantedById: input.actorId,
                grantReason: input.reason,
              },
              include: { title: true, selection: { select: { userId: true } } },
            },
      );
      const order = [
        h.lock,
        h.recipient,
        h.definition,
        h.existing,
        h.create,
        h.audit,
        h.outbox,
      ].map((fn) => fn.mock.invocationCallOrder[0]);
      expect(order).toEqual([...order].sort((a, b) => a - b));
      expect(h.audit.mock.calls[0][0]).toBe(h.transaction);
      expect(h.outbox.mock.calls[0][0]).toBe(h.transaction);
      expect(h.outbox.mock.calls[0][1]).toMatchObject({
        name:
          kind === 'award'
            ? 'achievements.award.awarded.v1'
            : 'custom-titles.granted.v1',
        version: 1,
        category: 'integration',
        actorId: 'actor',
        producer:
          kind === 'award' ? 'dss.api.achievements' : 'dss.api.custom-titles',
      });
    });
    it.each(['recipient', 'definition', 'existing'] as const)(
      'retains %s rejection precedence without evidence',
      async (stage) => {
        const h = harness();
        if (stage === 'recipient') {
          h.recipient.mockResolvedValue(false);
          h.definition.mockResolvedValue(null);
          h.existing.mockResolvedValue({ id: 'old' });
        } else if (stage === 'definition') {
          h.definition.mockResolvedValue(null);
          h.existing.mockResolvedValue({ id: 'old' });
        } else h.existing.mockResolvedValue({ id: 'old' });
        expect(await h.write()).toMatchObject({
          status:
            stage === 'recipient'
              ? 'USER_NOT_FOUND'
              : stage === 'existing'
                ? 'CONFLICT'
                : kind === 'award'
                  ? 'ACHIEVEMENT_NOT_FOUND'
                  : 'TITLE_NOT_FOUND',
        });
        for (const fn of [h.recipient, h.definition, h.existing])
          expect(fn).toHaveBeenCalledTimes(1);
        for (const fn of [h.create, h.audit, h.outbox])
          expect(fn).not.toHaveBeenCalled();
      },
    );
    it('starts both owned reads while recipient evidence is pending', async () => {
      const h = harness();
      let release!: (value: boolean) => void;
      h.recipient.mockReturnValue(
        new Promise<boolean>((resolve) => {
          release = resolve;
        }),
      );
      const result = h.write();
      await Promise.resolve();
      expect(h.definition).toHaveBeenCalledTimes(1);
      expect(h.existing).toHaveBeenCalledTimes(1);
      expect(h.create).not.toHaveBeenCalled();
      release(true);
      expect(await result).toMatchObject({ status: 'OK' });
    });
    it.each([
      'lock',
      'recipient',
      'definition',
      'existing',
      'create',
      'audit',
      'outbox',
    ] as const)(
      'propagates %s failures without a fallback result',
      async (stage) => {
        const h = harness();
        const error = new Error('Synthetic owner failure');
        h[stage].mockRejectedValueOnce(error);
        await expect(h.write()).rejects.toBe(error);
        if (stage === 'lock') expect(h.recipient).not.toHaveBeenCalled();
        if (
          ['lock', 'recipient', 'definition', 'existing', 'create'].includes(
            stage,
          )
        )
          expect(h.audit).not.toHaveBeenCalled();
        if (stage !== 'outbox') expect(h.outbox).not.toHaveBeenCalled();
      },
    );
  });
}

describe('Private evidence and mapping reuse', () => {
  it.each(['actor', null])(
    'preserves achievement %s actor shape for revocations',
    async (actorId) => {
      const audit = jest
        .fn<Promise<string>, Parameters<AuditWriterService['append']>>()
        .mockResolvedValue('audit');
      const outbox = jest
        .fn<Promise<string>, Parameters<OutboxWriterService['append']>>()
        .mockResolvedValue('outbox');
      const tx = {} as TransactionClient;
      const writer = new AchievementEvidenceWriter(
        { append: audit } as unknown as AuditWriterService,
        { append: outbox },
      );
      await writer.recordAward(tx, 'revoked', actorId, award);
      const payload = {
        awardId: award.id,
        userId: award.userId,
        achievementId: award.achievementId,
        kind: award.kind,
        sourceType: null,
        sourceId: null,
      };
      expect(audit).toHaveBeenCalledWith(tx, {
        action: 'achievements.award.revoked',
        actorType: actorId ? 'USER' : 'SYSTEM',
        ...(actorId ? { actorId } : {}),
        targetType: 'AchievementAward',
        targetId: award.id,
        metadata: payload,
      });
      expect(outbox.mock.calls[0][1]).toMatchObject({ payload });
      if (!actorId)
        expect(outbox.mock.calls[0][1]).not.toHaveProperty('actorId');
    },
  );
  it('maps both selected and unselected grants without exposing selection storage', () => {
    expect(toTitleGrant(titleGrant).selected).toBe(false);
    expect(
      toTitleGrant({ ...titleGrant, selection: { userId: 'recipient' } })
        .selected,
    ).toBe(true);
    expect(toTitleGrant(titleGrant)).not.toHaveProperty('selection');
  });
});

describe('Root lifetime and owned delegation', () => {
  it.each(['award', 'title'] as const)(
    'binds %s writer and ID reader to exactly one default transaction',
    async (kind) => {
      const tx = {} as TransactionClient;
      const exists = jest.fn().mockResolvedValue(true);
      const writer = jest.fn(
        async (
          client: TransactionClient,
          command: unknown,
          recipient: () => Promise<boolean>,
        ) => {
          expect(client).toBe(tx);
          expect(command).toBe(input);
          expect(exists).not.toHaveBeenCalled();
          expect(await recipient()).toBe(true);
          return 'owned-result';
        },
      );
      const transaction = jest.fn(
        async (operation: (client: TransactionClient) => Promise<unknown>) =>
          operation(tx),
      );
      const prisma = { $transaction: transaction } as unknown as PrismaService;
      const profiles = {
        exists,
      } as unknown as PrismaTransactionalProfileExistenceReader;
      const unit =
        kind === 'award'
          ? new PrismaManualAwardTransaction(
              prisma,
              { award: writer } as unknown as PrismaManualAwardWriter,
              profiles,
            )
          : new PrismaTitleGrantTransaction(
              prisma,
              { grant: writer } as unknown as PrismaTitleGrantWriter,
              profiles,
            );
      expect(
        await (unit instanceof PrismaManualAwardTransaction
          ? unit.award(input)
          : unit.grant(input)),
      ).toBe('owned-result');
      expect(transaction.mock.calls[0]).toHaveLength(1);
      expect(exists).toHaveBeenCalledWith(tx, input.userId);
      expect(writer).toHaveBeenCalledTimes(1);
    },
  );
  it('reads only ID with no status predicate and propagates lookup failure', async () => {
    const findUnique = jest.fn().mockResolvedValue({ id: 'recipient' });
    const tx = { user: { findUnique } } as unknown as TransactionClient;
    const reader = new PrismaTransactionalProfileExistenceReader();
    expect(await reader.exists(tx, 'recipient')).toBe(true);
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: 'recipient' },
      select: { id: true },
    });
    findUnique.mockResolvedValueOnce(null);
    expect(await reader.exists(tx, 'missing')).toBe(false);
    const error = new Error('Synthetic profile failure');
    findUnique.mockRejectedValueOnce(error);
    await expect(reader.exists(tx, 'recipient')).rejects.toBe(error);
  });
  it('delegates both repositories through semantic commands, never a recipient pre-read', async () => {
    const awardCommand = jest
      .fn()
      .mockResolvedValue({ status: 'USER_NOT_FOUND', award: null });
    const grantCommand = jest
      .fn()
      .mockResolvedValue({ status: 'USER_NOT_FOUND', grant: null });
    const prisma = {} as PrismaService;
    const audit = {} as AuditWriterService;
    const outbox = {} as OutboxWriterService;
    const awards = new PrismaAchievementsRepository(prisma, audit, outbox, {
      award: awardCommand,
    });
    const titles = new PrismaCustomTitlesRepository(prisma, audit, outbox, {
      grant: grantCommand,
    });
    await expect(
      awards.manualAward(
        'recipient',
        'definition',
        'Synthetic reason',
        'actor',
      ),
    ).resolves.toEqual({ status: 'USER_NOT_FOUND', award: null });
    await expect(
      titles.grant('recipient', 'definition', 'Synthetic reason', 'actor'),
    ).resolves.toEqual({ status: 'USER_NOT_FOUND', grant: null });
    expect(awardCommand).toHaveBeenCalledWith({
      userId: 'recipient',
      achievementId: 'definition',
      reason: 'Synthetic reason',
      actorId: 'actor',
    });
    expect(grantCommand).toHaveBeenCalledWith({
      userId: 'recipient',
      titleId: 'definition',
      reason: 'Synthetic reason',
      actorId: 'actor',
    });
  });
});
