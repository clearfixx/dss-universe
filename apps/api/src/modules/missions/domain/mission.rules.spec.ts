import {
  progressWindow,
  validateMission,
  type MissionInput,
} from './mission.rules';

const base: MissionInput = {
  title: '  Опублікуй корисний матеріал  ',
  description: '  ',
  metric: 'TOPICS',
  target: 25,
  startsAt: new Date('2026-11-01T00:00:00Z'),
  endsAt: new Date('2026-12-01T00:00:00Z'),
  active: true,
};

describe('mission rules', () => {
  it('trims text and drops an empty description', () => {
    expect(validateMission(base)).toEqual({
      ok: true,
      value: {
        ...base,
        title: 'Опублікуй корисний матеріал',
        description: null,
      },
    });
  });

  it.each([
    [{ title: 'ab' }, /title/],
    [{ description: 'x'.repeat(1001) }, /description/],
    [{ metric: 'LIKES' as never }, /metric/],
    [{ target: 0 }, /target/],
    [{ target: 1.5 }, /target/],
    [{ endsAt: new Date('2026-11-01T00:00:00Z') }, /end after/],
    [{ endsAt: new Date('2028-01-01T00:00:00Z') }, /366 days/],
  ])('rejects %o', (change, message) => {
    const result = validateMission({ ...base, ...change });
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toMatch(message);
  });

  it('counts from the start until now, capped at the end', () => {
    expect(progressWindow(base, new Date('2026-10-31T00:00:00Z'))).toBeNull();
    expect(progressWindow(base, new Date('2026-11-10T00:00:00Z'))).toEqual({
      since: base.startsAt,
      until: new Date('2026-11-10T00:00:00Z'),
    });
    expect(progressWindow(base, new Date('2027-01-01T00:00:00Z'))).toEqual({
      since: base.startsAt,
      until: base.endsAt,
    });
  });
});
