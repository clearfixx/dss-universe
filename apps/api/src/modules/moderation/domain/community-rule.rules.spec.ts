import {
  compareRuleCodes,
  normalizeRuleCode,
  normalizeRuleText,
} from './community-rule.rules';

describe('community rules', () => {
  it('normalizes numbers and rejects other shapes', () => {
    expect(normalizeRuleCode(' 2.3. ')).toBe('2.3');
    for (const bad of ['', 'a', '2..3', '1.2.3.4', '1234'])
      expect(() => normalizeRuleCode(bad)).toThrow(/rule number/);
  });

  it('bounds the text', () => {
    expect(normalizeRuleText('  No spam  ')).toBe('No spam');
    expect(() => normalizeRuleText('no')).toThrow(/3 to 1000/);
    expect(() => normalizeRuleText('x'.repeat(1001))).toThrow(/3 to 1000/);
  });

  it('orders numbers numerically', () => {
    expect(['3', '2.10', '2', '2.2'].sort(compareRuleCodes)).toEqual([
      '2',
      '2.2',
      '2.10',
      '3',
    ]);
    expect(compareRuleCodes('2.1', '2.1')).toBe(0);
  });
});
