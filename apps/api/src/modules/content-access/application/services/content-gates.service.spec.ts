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
  CreateContentGate,
} from '../../domain/types/content-gate.type';
import { ContentGatesService } from './content-gates.service';
import type { ContentAudienceReader } from '../../domain/ports/content-audience-reader.interface';
import type { ContentGateViewerFactsService } from './content-gate-viewer-facts.service';

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
  const findById = jest.fn<
    ReturnType<ContentGatesRepository['findById']>,
    Parameters<ContentGatesRepository['findById']>
  >();
  const readAudience = jest.fn<
    ReturnType<ContentAudienceReader['read']>,
    Parameters<ContentAudienceReader['read']>
  >();
  const readStatistics = jest.fn<
    ReturnType<ContentGateViewerFactsService['read']>,
    Parameters<ContentGateViewerFactsService['read']>
  >();
  const repository: jest.Mocked<ContentGatesRepository> = {
    create: jest.fn(),
    findById,
  };
  const audience: jest.Mocked<ContentAudienceReader> = { read: readAudience };
  const statistics = {
    read: readStatistics,
  } as unknown as jest.Mocked<ContentGateViewerFactsService>;
  const service = new ContentGatesService(repository, audience, statistics);
  function setFacts(facts: ContentGateViewerFacts | null) {
    statistics.read.mockResolvedValue(facts);
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

  it('shares viewer evidence only inside one closed scope and rereads revocation in the next scope', async () => {
    repository.findById.mockImplementation((id) =>
      Promise.resolve({ ...gate, id }),
    );
    setFacts({ ...baseFacts, reputation: 200, accountAgeDays: 100 });
    const scope = service.openViewerScope('viewer');
    const results = await Promise.all([
      scope.evaluate('one'),
      scope.evaluate('two'),
    ]);
    expect(results.every(({ allowed }) => allowed)).toBe(true);
    expect(readStatistics).toHaveBeenCalledTimes(1);
    expect(readAudience).toHaveBeenCalledTimes(1);
    expect(findById).toHaveBeenCalledTimes(2);
    scope.close();
    scope.close();
    await expect(scope.evaluate('one')).rejects.toThrow('scope is closed');
    expect(findById).toHaveBeenCalledTimes(2);
    setFacts(baseFacts);
    const next = service.openViewerScope('viewer');
    expect((await next.evaluate('one')).allowed).toBe(false);
    expect(readStatistics).toHaveBeenCalledTimes(2);
    expect(readAudience).toHaveBeenCalledTimes(2);
    next.close();
  });

  it('keeps scope evidence lazy and rejects missing gates and empty viewers without reading statistics', async () => {
    expect(() => service.openViewerScope(' ')).toThrow('requires a viewer');
    const scope = service.openViewerScope('viewer');
    expect(readStatistics).not.toHaveBeenCalled();
    repository.findById.mockResolvedValue(null);
    await expect(scope.evaluate('missing')).rejects.toThrow(
      'Gate was not found',
    );
    expect(readStatistics).not.toHaveBeenCalled();
    expect(readAudience).not.toHaveBeenCalled();
    scope.close();
  });

  it.each(['statistics', 'audience'])(
    'fails closed for absent %s in a scope, without author/Premium override',
    async (missing) => {
      repository.findById.mockResolvedValue(gate);
      setFacts({ ...baseFacts, groups: ['premium'] });
      if (missing === 'statistics') statistics.read.mockResolvedValue(null);
      else audience.read.mockResolvedValue(null);
      const scope = service.openViewerScope(gate.ownerId);
      await expect(scope.evaluate(gate.id)).rejects.toThrow(
        'viewer was not found',
      );
      scope.close();
    },
  );

  it('preserves mandatory GROUP checks in a Premium/author batch scope', async () => {
    repository.findById.mockResolvedValue(audienceGate);
    setFacts({ ...baseFacts, groups: ['premium'] });
    const scope = service.openViewerScope(gate.ownerId);
    expect(await scope.evaluate(gate.id)).toMatchObject({
      allowed: false,
      bypassed: false,
      unmet: ['GROUP'],
    });
    scope.close();
  });

  it('drains both private evidence reads and retains failure until scope closure', async () => {
    repository.findById.mockResolvedValue(gate);
    statistics.read.mockRejectedValue(new Error('Synthetic statistics outage'));
    let reached!: () => void, release!: () => void;
    const observed = new Promise<void>((resolve) => {
      reached = resolve;
    });
    const waiting = new Promise<
      Awaited<ReturnType<ContentAudienceReader['read']>>
    >((resolve) => {
      release = () => resolve({ groups: [], premium: false });
    });
    audience.read.mockImplementation(() => {
      reached();
      return waiting;
    });
    const scope = service.openViewerScope('viewer');
    let settled = false;
    const running = scope.evaluate(gate.id).catch((error: unknown) => {
      settled = true;
      return error;
    });
    await observed;
    expect(settled).toBe(false);
    release();
    expect(await running).toEqual(new Error('Synthetic statistics outage'));
    await expect(scope.evaluate(gate.id)).rejects.toThrow(
      'Synthetic statistics outage',
    );
    expect(readStatistics).toHaveBeenCalledTimes(1);
    expect(readAudience).toHaveBeenCalledTimes(1);
    scope.close();
  });

  it('cannot return an allowed result when a scope is closed during an in-flight evidence read', async () => {
    repository.findById.mockResolvedValue(gate);
    setFacts({ ...baseFacts, groups: ['premium'] });
    let reached!: () => void, release!: () => void;
    const observed = new Promise<void>((resolve) => {
      reached = resolve;
    });
    const waiting = new Promise<
      Awaited<ReturnType<ContentAudienceReader['read']>>
    >((resolve) => {
      release = () => resolve({ groups: [], premium: true });
    });
    audience.read.mockImplementation(() => {
      reached();
      return waiting;
    });
    const scope = service.openViewerScope('viewer');
    const running = scope.evaluate(gate.id).catch((error: unknown) => error);
    await observed;
    scope.close();
    release();
    expect(await running).toEqual(
      new Error('Content Gate evaluation scope is closed.'),
    );
  });

  it('does not begin evidence IO if the scope closes while its gate definition is being read', async () => {
    let release!: () => void;
    repository.findById.mockImplementation(
      () =>
        new Promise<ContentGate>((resolve) => {
          release = () => resolve(gate);
        }),
    );
    const scope = service.openViewerScope('viewer');
    const running = scope.evaluate(gate.id).catch((error: unknown) => error);
    scope.close();
    release();
    expect(await running).toEqual(
      new Error('Content Gate evaluation scope is closed.'),
    );
    expect(readStatistics).not.toHaveBeenCalled();
    expect(readAudience).not.toHaveBeenCalled();
  });

  it('handles a synchronous audience-provider failure without leaving statistics IO undrained', async () => {
    repository.findById.mockResolvedValue(gate);
    let release!: () => void, reached!: () => void;
    const observed = new Promise<void>((resolve) => {
      reached = resolve;
    });
    const waiting = new Promise<
      Awaited<ReturnType<ContentGateViewerFactsService['read']>>
    >((resolve) => {
      release = () => resolve(baseFacts);
    });
    statistics.read.mockImplementation(() => {
      reached();
      return waiting;
    });
    audience.read.mockImplementation(() => {
      throw new Error('Synthetic synchronous access failure');
    });
    const scope = service.openViewerScope('viewer');
    let settled = false;
    const running = scope.evaluate(gate.id).catch((error: unknown) => {
      settled = true;
      return error;
    });
    await observed;
    expect(settled).toBe(false);
    release();
    expect(await running).toEqual(
      new Error('Synthetic synchronous access failure'),
    );
    scope.close();
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
    expect(statistics.read.mock.calls).toHaveLength(0);
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

  it('creates a validated six-kind policy without rewriting the owner command', async () => {
    const input: CreateContentGate = {
      ownerId: 'owner',
      operator: 'ALL',
      requirements: [
        { kind: 'GROUP', threshold: null, groupKey: 'group:research' },
        ...(
          [
            'ACCOUNT_AGE_DAYS',
            'COMMENTS',
            'FORUM_POSTS',
            'PUBLICATIONS',
            'REPUTATION',
          ] as const
        ).map((kind) => ({ kind, threshold: 0, groupKey: null })),
      ],
    };
    repository.create.mockResolvedValue(gate);
    expect(await service.create(input)).toBe(gate);
    expect(repository.create.mock.calls).toEqual([[input]]);
  });

  const invalidRequirements: {
    label: string;
    requirements: CreateContentGate['requirements'];
  }[] = [
    { label: 'empty', requirements: [] },
    {
      label: 'too many',
      requirements: Array.from({ length: 7 }, () => ({
        kind: 'COMMENTS',
        threshold: 0,
        groupKey: null,
      })),
    },
    {
      label: 'duplicate kinds',
      requirements: [
        { kind: 'COMMENTS', threshold: 0, groupKey: null },
        { kind: 'COMMENTS', threshold: 1, groupKey: null },
      ],
    },
    {
      label: 'blank GROUP',
      requirements: [{ kind: 'GROUP', threshold: null, groupKey: ' ' }],
    },
    {
      label: 'missing GROUP',
      requirements: [{ kind: 'GROUP', threshold: null, groupKey: null }],
    },
    {
      label: 'numeric GROUP',
      requirements: [
        { kind: 'GROUP', threshold: 1, groupKey: 'group:research' },
      ],
    },
    {
      label: 'numeric audience',
      requirements: [
        { kind: 'COMMENTS', threshold: 0, groupKey: 'group:research' },
      ],
    },
    ...[
      null,
      -1,
      0.5,
      Number.MAX_SAFE_INTEGER + 1,
      Number.NaN,
      Number.POSITIVE_INFINITY,
    ].map((threshold) => ({
      label: 'invalid numeric ' + threshold,
      requirements: [{ kind: 'COMMENTS' as const, threshold, groupKey: null }],
    })),
  ];
  it.each(invalidRequirements)(
    'rejects $label requirements before persistence',
    ({ requirements }) => {
      expect(() =>
        service.create({ ownerId: 'owner', operator: 'ANY', requirements }),
      ).toThrow(BadRequestException);
      expect(repository.create.mock.calls).toHaveLength(0);
    },
  );
});

/** ALL means every key turns; ANY means one valid key opens the hatch. */
