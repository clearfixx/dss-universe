import {
  containsNode,
  normalizeDescription,
  normalizeSlug,
  normalizeTitle,
} from './static-page.rules';

describe('static page rules', () => {
  it('accepts clean addresses only', () => {
    expect(normalizeSlug(' Rules-2026 ')).toBe('rules-2026');
    for (const bad of [
      '',
      'a b',
      'a--b',
      '-a',
      'a/',
      'правила',
      'x'.repeat(81),
    ])
      expect(() => normalizeSlug(bad)).toThrow(/address/);
  });

  it('bounds the title and the description', () => {
    expect(normalizeTitle('  Правила  ')).toBe('Правила');
    expect(() => normalizeTitle('ab')).toThrow(/3 to 160/);
    expect(normalizeDescription(' ')).toBe('');
    expect(() => normalizeDescription('x'.repeat(301))).toThrow(/300/);
  });

  it('finds nodes anywhere in a document', () => {
    const doc = {
      type: 'doc',
      content: [{ type: 'blockquote', content: [{ type: 'contentGate' }] }],
    };
    expect(containsNode(doc, 'contentGate')).toBe(true);
    expect(containsNode(doc, 'image')).toBe(false);
    expect(containsNode(null, 'image')).toBe(false);
  });
});
