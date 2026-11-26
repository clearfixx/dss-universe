import { researchExcerpt } from './research-excerpt';

describe('research publication previews', () => {
  it('retains the complete final character at the excerpt boundary', () => {
    const prefix = 'я'.repeat(239);
    expect(researchExcerpt(prefix + '🧭x')).toBe(prefix + '🧭');
    expect(researchExcerpt('🧭'.repeat(241))).toBe('🧭'.repeat(240));
    expect(researchExcerpt('a'.repeat(241))).toBe('a'.repeat(240));
  });
});
