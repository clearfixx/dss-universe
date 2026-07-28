/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Reputation Tests
 * 📄 File: apps/api/src/modules/reputation/application/services/reputation.service.spec.ts
 *
 * 🎯 Purpose:
 * Verifies direct reputation policy, cooldown and append-only reversals.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { UserStatus } from '@prisma/client';

import type { UserBlockService, UsersService } from '@api/modules/users';

import type { ReputationRepository } from '../../domain/repositories/reputation.repository.interface';
import type { ReputationEntry } from '../../domain/types/reputation.type';
import { ReputationService } from './reputation.service';

const actor = {
  id: 'actor-1',
  email: 'actor@example.com',
  username: 'actor',
  passwordHash: 'hash',
  displayName: 'Actor',
  bio: null,
  location: null,
  website: null,
  technologies: [],
  interests: [],
  avatarUrl: null,
  coverUrl: null,
  status: UserStatus.ACTIVE,
  deactivatedAt: null,
  authVersion: 0,
  refreshTokenHash: null,
  emailVerifiedAt: null,
  lastSeenAt: null,
  createdAt: new Date('2025-01-01T00:00:00.000Z'),
  updatedAt: new Date('2025-01-01T00:00:00.000Z'),
} satisfies NonNullable<Awaited<ReturnType<UsersService['findRecordById']>>>;

const recipient = {
  ...actor,
  id: 'recipient-1',
  email: 'recipient@example.com',
  username: 'recipient',
  displayName: 'Recipient',
} satisfies NonNullable<Awaited<ReturnType<UsersService['findRecordById']>>>;

const entry: ReputationEntry = {
  id: 'entry-1',
  actor: {
    id: actor.id,
    username: actor.username,
    displayName: actor.displayName,
    avatarUrl: actor.avatarUrl,
  },
  recipientId: recipient.id,
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
  } as unknown as jest.Mocked<ReputationRepository>;
  const users = {
    findRecordById: jest.fn(),
    exists: jest.fn(),
  } as unknown as jest.Mocked<UsersService>;
  const blocks = {
    isBlocked: jest.fn(),
  } as unknown as jest.Mocked<UserBlockService>;
  const service = new ReputationService(repository, users, blocks);

  beforeEach(() => {
    jest.clearAllMocks();
    repository.policy.mockResolvedValue({
      minimumAccountAgeDays: 7,
      updatedById: null,
      updatedAt: new Date(),
    });
    blocks.isBlocked.mockResolvedValue(false);
    users.findRecordById
      .mockResolvedValueOnce(actor)
      .mockResolvedValueOnce(recipient);
  });

  it('appends a valid explainable decision', async () => {
    repository.createDirect.mockResolvedValue(entry);

    await expect(
      service.give(actor.id, recipient.id, 1, `  ${entry.reason}  `),
    ).resolves.toEqual(entry);

    // Jest verifies the injected repository boundary, not a detached callback.
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(repository.createDirect).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: actor.id,
        recipientId: recipient.id,
        value: 1,
        reason: entry.reason,
      }),
    );
  });

  it('rejects self-rating before persistence', async () => {
    await expect(
      service.give(actor.id, actor.id, 1, 'Self applause'),
    ).rejects.toMatchObject({ status: 400 });
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(repository.createDirect).not.toHaveBeenCalled();
  });

  it('enforces configured account age', async () => {
    users.findRecordById.mockReset();
    users.findRecordById
      .mockResolvedValueOnce({ ...actor, createdAt: new Date() })
      .mockResolvedValueOnce(recipient);

    await expect(
      service.give(actor.id, recipient.id, 1, 'Helpful answer'),
    ).rejects.toMatchObject({ status: 400 });
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(repository.createDirect).not.toHaveBeenCalled();
  });

  it('converts an atomic cooldown conflict into HTTP 409', async () => {
    repository.createDirect.mockResolvedValue(null);

    await expect(
      service.give(actor.id, recipient.id, -1, 'Unconstructive behavior'),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('appends a compensating reversal with a mandatory reason', async () => {
    const reversal = {
      ...entry,
      id: 'reversal-1',
      value: -1 as const,
      reason: 'Moderator correction.',
    };
    repository.findOriginalById.mockResolvedValue(entry);
    repository.reverse.mockResolvedValue(reversal);

    await expect(
      service.reverse(entry.id, 'moderator-1', reversal.reason),
    ).resolves.toEqual(reversal);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(repository.reverse).toHaveBeenCalledWith(
      entry.id,
      'moderator-1',
      recipient.id,
      -1,
      reversal.reason,
    );
  });

  it('rejects a second reversal', async () => {
    repository.findOriginalById.mockResolvedValue({
      ...entry,
      reversal: {
        id: 'reversal-1',
        actor: entry.actor,
        reason: 'Already corrected.',
        createdAt: new Date(),
      },
    });

    await expect(
      service.reverse(entry.id, 'moderator-1', 'Another correction.'),
    ).rejects.toMatchObject({ status: 409 });
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(repository.reverse).not.toHaveBeenCalled();
  });
});

/**
 * A ledger test cannot change history either, but it can stop bad history from
 * being written.
 */
