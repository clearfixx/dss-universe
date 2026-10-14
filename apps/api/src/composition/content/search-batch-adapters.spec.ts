/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Content Composition Tests
 * 📄 File: apps/api/src/composition/content/search-batch-adapters.spec.ts
 *
 * 🎯 Purpose:
 * Pins minimal scoped verdict/text boundaries and rejects partial provider output.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { ContentGateDecisionScope } from '@api/modules/content-access';
import type { EditorSearchBatchProjector } from '@api/modules/editor';
import { EditorGateDecisionScopesAdapter } from './infrastructure/editor-gate-decision-scopes.adapter';
import { NewsSearchBatchProjectorAdapter } from './infrastructure/news-search-batch-projector.adapter';

describe('Search batch root adapters', () => {
  it('copies only verdict fields and forwards closure without leaking owner evidence', async () => {
    const supplied = {
      gateId: 'gate',
      allowed: false,
      bypassed: false,
      unmet: ['GROUP'] as ['GROUP'],
      notice: 'Denied',
      owner: 'private',
      statistics: 'private',
    };
    const evaluate = jest
      .fn<
        ReturnType<ContentGateDecisionScope['evaluate']>,
        Parameters<ContentGateDecisionScope['evaluate']>
      >()
      .mockResolvedValue(supplied);
    const close = jest.fn<void, []>();
    const open = jest.fn().mockReturnValue({ evaluate, close });
    const scope = new EditorGateDecisionScopesAdapter({ open }).open('viewer');
    expect(await scope.evaluate('gate')).toEqual({
      gateId: 'gate',
      allowed: false,
      bypassed: false,
      unmet: ['GROUP'],
      notice: 'Denied',
    });
    expect(open).toHaveBeenCalledWith('viewer');
    scope.close();
    expect(close).toHaveBeenCalledTimes(1);
  });
  it('copies only ordered safe text and rejects partial batch output', async () => {
    const supplied = [
      { searchText: 'first', private: 'secret' },
      { searchText: 'second', private: 'secret' },
    ];
    const project = jest
      .fn<
        ReturnType<EditorSearchBatchProjector['project']>,
        Parameters<EditorSearchBatchProjector['project']>
      >()
      .mockResolvedValue(supplied);
    const adapter = new NewsSearchBatchProjectorAdapter({ project });
    expect(await adapter.project(['one', 'two'], 'viewer')).toEqual([
      { searchText: 'first' },
      { searchText: 'second' },
    ]);
    expect(project).toHaveBeenCalledWith(['one', 'two'], 'viewer');
    project.mockResolvedValue([{ searchText: 'partial' }]);
    await expect(adapter.project(['one', 'two'], 'viewer')).rejects.toThrow(
      'incomplete',
    );
  });
  it('propagates owner failures without partial/default evidence', async () => {
    const project = jest.fn().mockRejectedValue(new Error('Synthetic outage'));
    await expect(
      new NewsSearchBatchProjectorAdapter({ project }).project(
        ['source'],
        'viewer',
      ),
    ).rejects.toThrow('Synthetic outage');
  });
});
