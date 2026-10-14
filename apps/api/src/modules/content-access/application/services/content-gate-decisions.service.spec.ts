/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Content Access Tests
 * 📄 File: apps/api/src/modules/content-access/application/services/content-gate-decisions.service.spec.ts
 *
 * 🎯 Purpose:
 * Checks minimal verdict projection and propagation of evaluation failures.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { ContentGateDecisionsService } from './content-gate-decisions.service';
import { ContentGatesService } from './content-gates.service';
import type { ContentGateEvaluation } from '../../domain/types/content-gate.type';

describe('ContentGateDecisionsService', () => {
  const evaluation: ContentGateEvaluation = {
    gate: {
      id: 'gate',
      ownerId: 'private-owner',
      operator: 'ALL',
      requirements: [
        {
          id: 'requirement',
          kind: 'REPUTATION',
          threshold: 100,
          groupKey: null,
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    allowed: false,
    bypassed: false,
    unmet: ['REPUTATION'],
    notice: 'Denied',
  };
  it('returns exactly public decision fields with no aggregate or shared mutable array', async () => {
    const gates = { evaluate: jest.fn().mockResolvedValue(evaluation) };
    const service = new ContentGateDecisionsService(
      gates as unknown as ContentGatesService,
    );
    const decision = await service.evaluate('gate', null);
    expect(decision).toEqual({
      gateId: 'gate',
      allowed: false,
      bypassed: false,
      unmet: ['REPUTATION'],
      notice: 'Denied',
    });
    expect(gates.evaluate.mock.calls).toEqual([['gate', null]]);
    decision.unmet.length = 0;
    expect(evaluation.unmet).toEqual(['REPUTATION']);
  });
  it('does not turn an unavailable gate into an allow or a placeholder success', async () => {
    const gates = {
      evaluate: jest.fn().mockRejectedValue(new Error('Unavailable')),
    };
    const service = new ContentGateDecisionsService(
      gates as unknown as ContentGatesService,
    );
    await expect(service.evaluate('gate', 'viewer')).rejects.toThrow(
      'Unavailable',
    );
  });

  it('keeps scoped definitions private and forwards explicit closure', async () => {
    const evaluate = jest
      .fn<Promise<ContentGateEvaluation>, [string]>()
      .mockResolvedValue(evaluation);
    const close = jest.fn<void, []>();
    const openViewerScope = jest.fn().mockReturnValue({ evaluate, close });
    const service = new ContentGateDecisionsService({
      openViewerScope,
    } as unknown as ContentGatesService);
    const scope = service.open('viewer');
    expect(await scope.evaluate('gate')).toEqual({
      gateId: 'gate',
      allowed: false,
      bypassed: false,
      unmet: ['REPUTATION'],
      notice: 'Denied',
    });
    expect(openViewerScope).toHaveBeenCalledWith('viewer');
    scope.close();
    expect(close).toHaveBeenCalledTimes(1);
  });
});
