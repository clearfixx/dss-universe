import type { ReputationActor } from '@api/modules/reputation';
import type { ReputationEntryFact } from '@api/modules/reputation/infrastructure';

import { composeReputationEntry } from './reputation-entry.mapper';

const actor: ReputationActor = {
  id: 'actor',
  username: 'actor',
  displayName: null,
  avatarUrl: null,
};
const profiles = new Map([[actor.id, actor]]);
const fact = (
  sourceType: string | null,
  sourceId: string | null,
): ReputationEntryFact => ({
  id: 'entry',
  actorId: 'actor',
  recipientId: 'recipient',
  value: 1,
  reason: 'Reason',
  sourceType,
  sourceId,
  createdAt: new Date(0),
});

describe('composeReputationEntry source', () => {
  it('maps a known source as not deleted', () => {
    expect(
      composeReputationEntry(
        fact('FORUM_POST', 'post'),
        profiles,
        undefined,
        new Map(),
      ).source,
    ).toEqual({ type: 'FORUM_POST', id: 'post', deleted: false });
  });

  it('drops missing or unknown sources', () => {
    for (const [type, id] of [
      [null, null],
      ['FORUM_POST', null],
      ['SOMETHING_ELSE', 'x'],
    ] as const) {
      expect(
        composeReputationEntry(fact(type, id), profiles, undefined, new Map())
          .source,
      ).toBeNull();
    }
  });

  it('fails loudly when actor evidence is missing', () => {
    expect(() =>
      composeReputationEntry(fact(null, null), new Map(), undefined, new Map()),
    ).toThrow('Reputation actor evidence is incomplete.');
  });
});
