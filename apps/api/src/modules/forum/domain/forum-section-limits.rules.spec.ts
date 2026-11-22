import { atLeastRole } from './forum-access.rules';
import {
  fileExtension,
  gateBlockKinds,
  normalizeSectionLimits,
} from './forum-section-limits.rules';

describe('forum section limits', () => {
  it('normalises formats and validates ranges', () => {
    expect(
      normalizeSectionLimits({
        attachmentFormats: [' .PDF', 'zip', 'pdf'],
        attachmentMaxMb: 25,
        autoCloseDays: null,
        gateBlockTypes: ['FILES', 'TEXT'],
      }),
    ).toEqual({
      attachmentFormats: ['pdf', 'zip'],
      attachmentMaxMb: 25,
      autoCloseDays: null,
      gateBlockTypes: ['TEXT', 'FILES'],
    });
    expect(() => normalizeSectionLimits({ attachmentMaxMb: 0 })).toThrow(/MB/);
    expect(() => normalizeSectionLimits({ autoCloseDays: 0 })).toThrow(/days/);
    expect(() =>
      normalizeSectionLimits({ attachmentFormats: ['p d f'] }),
    ).toThrow(/extension/);
    expect(() => normalizeSectionLimits({ gateCreateRole: 'GUEST' })).toThrow(
      /Guests/,
    );
    expect(() => normalizeSectionLimits({ gateBlockTypes: [] })).toThrow(
      /at least one/,
    );
  });

  it('finds the block kinds inside hidden blocks only', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'codeBlock' },
        {
          type: 'contentGate',
          content: [
            { type: 'paragraph', content: [{ type: 'text' }] },
            { type: 'attachment' },
          ],
        },
      ],
    };
    expect([...gateBlockKinds(doc, 'contentGate')].sort()).toEqual([
      'FILES',
      'TEXT',
    ]);
  });

  it('walks a real EditorDocument (root node in an object content)', () => {
    const document = {
      schemaVersion: 1,
      profile: 'FORUM_TOPIC',
      content: {
        type: 'doc',
        content: [{ type: 'contentGate', content: [{ type: 'codeBlock' }] }],
      },
    };
    expect([...gateBlockKinds(document, 'contentGate')]).toEqual(['CODE']);
  });

  it('compares roles and file extensions', () => {
    expect(atLeastRole('CONTRIBUTOR', 'MEMBER')).toBe(true);
    expect(atLeastRole('MEMBER', 'CONTRIBUTOR')).toBe(false);
    expect(fileExtension('Report.Final.PDF')).toBe('pdf');
    expect(fileExtension('README')).toBe('');
  });
});
