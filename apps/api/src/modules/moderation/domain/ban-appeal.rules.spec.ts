import { canAddAppealFile, normalizeAppealText } from './ban-appeal.rules';

describe('ban appeal rules', () => {
  it('bounds the appeal text', () => {
    expect(normalizeAppealText('  Please  ')).toBe('Please');
    expect(() => normalizeAppealText('no')).toThrow(/3 to 1000/);
    expect(() => normalizeAppealText('x'.repeat(1001))).toThrow(/3 to 1000/);
  });

  it('keeps five attached and ten uploaded screenshots at most', () => {
    expect(canAddAppealFile(4, 9)).toBe(true);
    expect(canAddAppealFile(5, 5)).toBe(false);
    expect(canAddAppealFile(0, 10)).toBe(false);
  });
});
