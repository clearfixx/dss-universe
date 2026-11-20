/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Interaction Platform
 * 📄 File: apps/api/src/modules/interactions/application/services/polls.service.spec.ts
 *
 * 🎯 Purpose:
 * Verifies owner-policy checks, one-time ballots and anonymous voter privacy.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { PollsRepository } from '../../domain/repositories/polls.repository.interface';
import type { InteractionTargetsService } from './interaction-targets.service';
import { PollsService } from './polls.service';

describe('PollsService', () => {
  const definition = {
    id: 'poll',
    interactionTargetId: 'target',
    visibility: 'OPEN' as const,
    maxChoices: 1,
    optionIds: ['a', 'b'],
  };
  const result = {
    id: 'poll',
    interactionTargetId: 'target',
    question: 'Question?',
    visibility: 'OPEN' as const,
    maxChoices: 1,
    totalBallots: 1,
    options: [],
    viewerChoiceIds: ['a'],
    createdAt: new Date(),
  };
  const repository: jest.Mocked<PollsRepository> = {
    create: jest.fn(),
    findDefinition: jest.fn(),
    findByTarget: jest.fn(),
    castBallot: jest.fn(),
    voters: jest.fn(),
  };
  const targets = { authorize: jest.fn(), getById: jest.fn() };
  const service = new PollsService(
    repository,
    targets as unknown as InteractionTargetsService,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    repository.findDefinition.mockResolvedValue(definition);
    repository.findByTarget.mockResolvedValue(result);
    targets.authorize.mockResolvedValue({ allowed: true });
  });

  it('casts a ballot only after the owner allows REACT', async () => {
    repository.castBallot.mockResolvedValue('CAST');
    await expect(service.castBallot('voter', 'poll', ['a'])).resolves.toBe(
      result,
    );
    expect(targets.authorize).toHaveBeenCalledWith(
      'target',
      { kind: 'AUTHENTICATED', subjectId: 'voter' },
      'REACT',
    );
    expect(repository.castBallot.mock.calls).toEqual([
      [definition, 'voter', ['a']],
    ]);
  });

  it('denies voting when the owner policy refuses (closed topic, sanctions)', async () => {
    targets.authorize.mockResolvedValue({
      allowed: false,
      reason: 'TARGET_LOCKED',
    });
    await expect(service.castBallot('voter', 'poll', ['a'])).rejects.toThrow(
      ForbiddenException,
    );
    expect(repository.castBallot.mock.calls).toHaveLength(0);
  });

  it('rejects a second ballot', async () => {
    repository.castBallot.mockResolvedValue('ALREADY_VOTED');
    await expect(service.castBallot('voter', 'poll', ['a'])).rejects.toThrow(
      ConflictException,
    );
  });

  it('reports a missing poll', async () => {
    repository.findDefinition.mockResolvedValue(null);
    await expect(service.castBallot('voter', 'poll', ['a'])).rejects.toThrow(
      NotFoundException,
    );
  });

  it('lets guests read results through the owner READ decision', async () => {
    await service.forTarget({ kind: 'GUEST' }, 'target');
    expect(targets.authorize).toHaveBeenCalledWith(
      'target',
      { kind: 'GUEST' },
      'READ',
    );
    expect(repository.findByTarget.mock.calls).toEqual([['target', null]]);
  });

  it('never lists voters of an anonymous poll', async () => {
    repository.findDefinition.mockResolvedValue({
      ...definition,
      visibility: 'ANONYMOUS',
    });
    await expect(
      service.voters({ kind: 'GUEST' }, 'poll', 'a', 1, 20),
    ).rejects.toThrow(ForbiddenException);
    expect(repository.voters.mock.calls).toHaveLength(0);
  });

  it('lists voters of an open poll option', async () => {
    repository.voters.mockResolvedValue({
      voterIds: ['voter'],
      total: 1,
      page: 1,
      limit: 20,
    });
    await expect(
      service.voters({ kind: 'GUEST' }, 'poll', 'a', 1, 20),
    ).resolves.toMatchObject({ voterIds: ['voter'] });
  });

  it('rejects an option from another poll when listing voters', async () => {
    await expect(
      service.voters({ kind: 'GUEST' }, 'poll', 'z', 1, 20),
    ).rejects.toThrow(NotFoundException);
  });
});
