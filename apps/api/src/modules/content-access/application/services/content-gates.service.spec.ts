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
import type {
  ContentGate,
  ContentGateViewerFacts,
} from '../../domain/types/content-gate.type';
import { ContentGatesService } from './content-gates.service';
import type { ContentAudienceReader } from '../../domain/ports/content-audience-reader.interface';

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
  const audience: jest.Mocked<ContentAudienceReader> = { read: jest.fn() };
  const service = new ContentGatesService(repository, audience);
  function setFacts(facts: ContentGateViewerFacts | null) {
    repository.viewerFacts.mockResolvedValue(facts);
    audience.read.mockResolvedValue(
      facts
        ? {
            groups: facts.groups,
            premium: facts.groups.some(
              (key) => key.toLowerCase() === 'premium',
            ),
          }
        : null,
    );
  }

  beforeEach(() => jest.resetAllMocks());

  const baseFacts = {
    accountAgeDays: 0,
    comments: 0,
    forumPosts: 0,
    publications: 0,
    reputation: 0,
    groups: [] as string[],
  };
  const audienceGate: ContentGate = {
    ...gate,
    requirements: [
      { id: 'staff', kind: 'GROUP', threshold: null, groupKey: 'moderators' },
      ...gate.requirements,
    ],
  };

  it('does not infer Premium from obsolete statistics or system role names', async () => {
    repository.findById.mockResolvedValue(gate);
    setFacts({ ...baseFacts, groups: ['PREMIUM'] });
    audience.read.mockResolvedValue({ groups: ['PREMIUM'], premium: false });
    await expect(service.evaluate(gate.id, 'viewer')).resolves.toMatchObject({
      allowed: false,
      bypassed: false,
    });
  });

  it('fails closed when current audience evidence is unavailable', async () => {
    repository.findById.mockResolvedValue(gate);
    setFacts(baseFacts);
    audience.read.mockRejectedValue(new Error('Audience unavailable'));
    await expect(service.evaluate(gate.id, 'viewer')).rejects.toThrow(
      'Audience unavailable',
    );
  });

  it.each(['ALL', 'ANY'] as const)(
    'does not let Premium bypass GROUP with %s thresholds',
    async (operator) => {
      repository.findById.mockResolvedValue({ ...audienceGate, operator });
      setFacts({
        ...baseFacts,
        groups: ['Premium'],
      });
      await expect(
        service.evaluate(gate.id, 'premium-viewer'),
      ).resolves.toMatchObject({
        allowed: false,
        bypassed: false,
        unmet: ['GROUP'],
      });
    },
  );

  it('does not let high reputation or author preview override the audience', async () => {
    repository.findById.mockResolvedValue({ ...audienceGate, operator: 'ANY' });
    setFacts({
      ...baseFacts,
      reputation: 1000,
    });
    for (const viewer of ['ordinary-viewer', gate.ownerId]) {
      await expect(service.evaluate(gate.id, viewer)).resolves.toMatchObject({
        allowed: false,
        bypassed: false,
        unmet: ['GROUP'],
      });
    }
  });

  it.each(['ALL', 'ANY'] as const)(
    'lets eligible Premium members bypass only the %s numeric thresholds',
    async (operator) => {
      repository.findById.mockResolvedValue({ ...audienceGate, operator });
      setFacts({
        ...baseFacts,
        groups: ['premium', 'moderators'],
      });
      await expect(
        service.evaluate(gate.id, 'premium-viewer'),
      ).resolves.toMatchObject({
        allowed: true,
        bypassed: true,
        unmet: [],
      });
    },
  );

  it.each([
    'ACCOUNT_AGE_DAYS',
    'COMMENTS',
    'FORUM_POSTS',
    'PUBLICATIONS',
    'REPUTATION',
  ] as const)(
    'automatically bypasses the %s threshold for Premium',
    async (kind) => {
      repository.findById.mockResolvedValue({
        ...gate,
        requirements: [
          { id: 'threshold', kind, threshold: 100, groupKey: null },
        ],
      });
      setFacts({
        ...baseFacts,
        groups: ['premium'],
      });
      await expect(
        service.evaluate(gate.id, 'premium-viewer'),
      ).resolves.toMatchObject({ allowed: true, bypassed: true });
    },
  );

  it.each(['ALL', 'ANY'] as const)(
    'allows a matching GROUP-only policy without claiming a %s numeric bypass',
    async (operator) => {
      repository.findById.mockResolvedValue({
        ...audienceGate,
        operator,
        requirements: [audienceGate.requirements[0]],
      });
      setFacts({
        ...baseFacts,
        groups: ['moderators', 'premium'],
      });
      await expect(
        service.evaluate(gate.id, 'premium-viewer'),
      ).resolves.toMatchObject({ allowed: true, bypassed: false });
    },
  );

  it('retains ANY numeric semantics after audience membership succeeds', async () => {
    repository.findById.mockResolvedValue({ ...audienceGate, operator: 'ANY' });
    setFacts({
      ...baseFacts,
      groups: ['moderators'],
    });
    await expect(service.evaluate(gate.id, 'viewer')).resolves.toMatchObject({
      allowed: false,
      bypassed: false,
    });
    setFacts({
      ...baseFacts,
      groups: ['moderators'],
      reputation: 100,
    });
    await expect(service.evaluate(gate.id, 'viewer')).resolves.toMatchObject({
      allowed: true,
      bypassed: false,
    });
  });

  it('retains author threshold preview only after audience membership succeeds', async () => {
    repository.findById.mockResolvedValue(audienceGate);
    setFacts({
      ...baseFacts,
      groups: ['moderators'],
    });
    await expect(
      service.evaluate(gate.id, gate.ownerId),
    ).resolves.toMatchObject({ allowed: true, bypassed: true });
  });

  it('fails closed for missing eligibility facts before author preview', async () => {
    repository.findById.mockResolvedValue(gate);
    setFacts(null);
    await expect(service.evaluate(gate.id, gate.ownerId)).rejects.toThrow(
      'Content Gate viewer was not found.',
    );
  });

  it('fails closed when an ALL requirement is unmet', async () => {
    repository.findById.mockResolvedValue(gate);
    setFacts({
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
    setFacts({
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
