/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Reputation Tests
 * 📄 File: apps/api/src/modules/reputation/application/services/reputation.service.spec.ts
 *
 * 🎯 Purpose:
 * Verifies unchanged direct reputation policy using minimal, non-secret evidence ports.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { ReputationRepository } from '../../domain/repositories/reputation.repository.interface';
import type { ReputationAccountReader } from '../../contracts/account-evidence.port';
import type { ReputationBlockReader } from '../../contracts/block-decision.port';
import type { ReputationProfileExistence } from '../../contracts/profile-existence.port';
import type { ReputationEntry } from '../../domain/types/reputation.type';
import { ReputationService } from './reputation.service';
const actor = { active: true, createdAt: new Date('2025-01-01T00:00:00.000Z') };
const recipient = { ...actor };
const entry: ReputationEntry = {
  id: 'entry-1',
  actor: {
    id: 'actor-1',
    username: 'actor',
    displayName: 'Actor',
    avatarUrl: null,
  },
  recipientId: 'recipient-1',
  value: 1,
  reason: 'Consistently helpful feedback.',
  createdAt: new Date(),
  reversal: null,
};
describe('ReputationService', () => {
  const repository = {
    policy: jest.fn(),
    updatePolicy: jest.fn(),
    createDirect: jest.fn(),
    findOriginalById: jest.fn(),
    reverse: jest.fn(),
    history: jest.fn(),
  } satisfies jest.Mocked<ReputationRepository>;
  const accounts = {
    find: jest.fn(),
  } satisfies jest.Mocked<ReputationAccountReader>;
  const blocks = {
    isBlocked: jest.fn(),
  } satisfies jest.Mocked<ReputationBlockReader>;
  const profiles = {
    exists: jest.fn(),
  } satisfies jest.Mocked<ReputationProfileExistence>;
  const service = new ReputationService(repository, accounts, blocks, profiles);
  beforeEach(() => {
    jest.resetAllMocks();
    repository.policy.mockResolvedValue({
      minimumAccountAgeDays: 7,
      updatedById: null,
      updatedAt: new Date(),
    });
    blocks.isBlocked.mockResolvedValue(false);
    profiles.exists.mockResolvedValue(true);
    accounts.find.mockResolvedValueOnce(actor).mockResolvedValueOnce(recipient);
  });
  it('appends a valid explainable decision', async () => {
    repository.createDirect.mockResolvedValue(entry);
    expect(
      await service.give('actor-1', 'recipient-1', 1, `  ${entry.reason}  `),
    ).toEqual(entry);
    expect(repository.createDirect.mock.calls).toEqual([
      [
        expect.objectContaining({
          actorId: 'actor-1',
          recipientId: 'recipient-1',
          value: 1,
          reason: entry.reason,
        }),
      ],
    ]);
  });
  it('rejects self-rating before evidence or persistence', async () => {
    await expect(
      service.give('actor-1', 'actor-1', 1, 'Self applause'),
    ).rejects.toMatchObject({ status: 400 });
    expect(accounts.find.mock.calls).toHaveLength(0);
    expect(repository.createDirect.mock.calls).toHaveLength(0);
  });
  it('enforces configured account age', async () => {
    accounts.find.mockReset();
    accounts.find
      .mockResolvedValueOnce({ ...actor, createdAt: new Date() })
      .mockResolvedValueOnce(recipient);
    await expect(
      service.give('actor-1', 'recipient-1', 1, 'Helpful answer'),
    ).rejects.toThrow('Your account must be at least 7 days old.');
    expect(repository.createDirect.mock.calls).toHaveLength(0);
  });
  it('converts an atomic cooldown conflict to HTTP 409', async () => {
    repository.createDirect.mockResolvedValue(null);
    await expect(
      service.give('actor-1', 'recipient-1', -1, 'Unconstructive behavior'),
    ).rejects.toMatchObject({ status: 409 });
  });
  it('appends an attributable compensating reversal', async () => {
    repository.findOriginalById.mockResolvedValue(entry);
    const reversal = {
      ...entry,
      id: 'reversal-1',
      value: -1 as const,
      reason: 'Moderator correction.',
    };
    repository.reverse.mockResolvedValue(reversal);
    expect(
      await service.reverse(entry.id, 'moderator-1', reversal.reason),
    ).toEqual(reversal);
    expect(repository.reverse.mock.calls).toEqual([
      [entry.id, 'moderator-1', 'recipient-1', -1, reversal.reason],
    ]);
  });
  it('rejects a second reversal', async () => {
    repository.findOriginalById.mockResolvedValue({
      ...entry,
      reversal: {
        id: 'reversal-1',
        actor: entry.actor,
        reason: 'Already corrected',
        createdAt: new Date(),
      },
    });
    await expect(
      service.reverse(entry.id, 'moderator-1', 'Another correction.'),
    ).rejects.toMatchObject({ status: 409 });
    expect(repository.reverse.mock.calls).toHaveLength(0);
  });
  it.each([null, { ...actor, active: false }])(
    'denies missing/inactive actors from minimal evidence',
    async (value) => {
      accounts.find.mockReset();
      accounts.find
        .mockResolvedValueOnce(value)
        .mockResolvedValueOnce(recipient);
      await expect(
        service.give('actor-1', 'recipient-1', 1, 'Helpful answer'),
      ).rejects.toThrow('The reputation actor is not active.');
      expect(repository.createDirect.mock.calls).toHaveLength(0);
    },
  );
  it.each([null, { ...recipient, active: false }])(
    'denies missing/inactive recipients',
    async (value) => {
      accounts.find.mockReset();
      accounts.find.mockResolvedValueOnce(actor).mockResolvedValueOnce(value);
      await expect(
        service.give('actor-1', 'recipient-1', 1, 'Helpful answer'),
      ).rejects.toThrow('The reputation recipient is not active.');
      expect(repository.createDirect.mock.calls).toHaveLength(0);
    },
  );
  it('honors the current bidirectional block decision', async () => {
    blocks.isBlocked.mockResolvedValue(true);
    await expect(
      service.give('actor-1', 'recipient-1', 1, 'Helpful answer'),
    ).rejects.toThrow('Reputation is unavailable between blocked users.');
    expect(blocks.isBlocked.mock.calls).toEqual([['actor-1', 'recipient-1']]);
    expect(repository.createDirect.mock.calls).toHaveLength(0);
  });
  it('propagates evidence failure without a ledger write', async () => {
    accounts.find.mockReset();
    accounts.find.mockRejectedValue(new Error('Account evidence unavailable'));
    await expect(
      service.give('actor-1', 'recipient-1', 1, 'Helpful answer'),
    ).rejects.toThrow('Account evidence unavailable');
    expect(repository.createDirect.mock.calls).toHaveLength(0);
  });
  it('uses existence rather than eligibility for public history lookup', async () => {
    repository.history.mockResolvedValue({ items: [], total: 0, score: 0 });
    await service.history('recipient-1');
    expect(profiles.exists.mock.calls).toEqual([['recipient-1']]);
    expect(accounts.find.mock.calls).toHaveLength(0);
    profiles.exists.mockResolvedValue(false);
    await expect(service.history('missing')).rejects.toThrow(
      'Reputation recipient not found.',
    );
  });
});
