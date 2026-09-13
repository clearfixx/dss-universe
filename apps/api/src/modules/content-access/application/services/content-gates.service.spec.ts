/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Content Access
 * 📄 File: apps/api/src/modules/content-access/application/services/content-gates.service.spec.ts
 *
 * 🎯 Purpose:
 * Verifies Content Gate validation, ALL/ANY semantics and Premium bypass.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { BadRequestException } from '@nestjs/common';

import type { ContentGatesRepository } from '../../domain/repositories/content-gates.repository.interface';
import type { ContentGate } from '../../domain/types/content-gate.type';
import { ContentGatesService } from './content-gates.service';

const gate: ContentGate = {
  id: 'b9d2b2c8-91c6-41f1-b0e6-f46410a5445a',
  ownerId: 'owner',
  operator: 'ALL',
  requirements: [
    { id: 'age', kind: 'ACCOUNT_AGE_DAYS', threshold: 30, groupKey: null },
    { id: 'rep', kind: 'REPUTATION', threshold: 100, groupKey: null },
  ],
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('ContentGatesService', () => {
  const repository: jest.Mocked<ContentGatesRepository> = {
    create: jest.fn(),
    findById: jest.fn(),
    viewerFacts: jest.fn(),
  };
  const service = new ContentGatesService(repository);

  beforeEach(() => jest.clearAllMocks());

  it('fails closed when an ALL requirement is unmet', async () => {
    repository.findById.mockResolvedValue(gate);
    repository.viewerFacts.mockResolvedValue({
      accountAgeDays: 40,
      comments: 0,
      forumPosts: 0,
      publications: 0,
      reputation: 50,
      groups: [],
    });
    await expect(service.evaluate(gate.id, 'viewer')).resolves.toMatchObject({
      allowed: false,
      bypassed: false,
      unmet: ['REPUTATION'],
    });
  });

  it('always exposes a visible Premium bypass notice', async () => {
    repository.findById.mockResolvedValue(gate);
    repository.viewerFacts.mockResolvedValue({
      accountAgeDays: 0,
      comments: 0,
      forumPosts: 0,
      publications: 0,
      reputation: 0,
      groups: ['Premium'],
    });
    const result = await service.evaluate(gate.id, 'viewer');
    expect(result).toMatchObject({
      allowed: true,
      bypassed: true,
    });
    expect(result.notice).toContain('Premium');
  });

  it('fails closed for guests without querying user facts', async () => {
    repository.findById.mockResolvedValue(gate);

    await expect(service.evaluate(gate.id, null)).resolves.toMatchObject({
      allowed: false,
      bypassed: false,
      unmet: ['ACCOUNT_AGE_DAYS', 'REPUTATION'],
      notice: 'Sign in to check hidden content requirements.',
    });
    expect(repository.viewerFacts.mock.calls).toHaveLength(0);
  });

  it('rejects malformed group requirements', () => {
    expect(() =>
      service.create({
        ownerId: 'owner',
        operator: 'ANY',
        requirements: [{ kind: 'GROUP', threshold: 1, groupKey: 'Premium' }],
      }),
    ).toThrow(BadRequestException);
  });
});

/** ALL means every key turns; ANY means one valid key opens the hatch. */
