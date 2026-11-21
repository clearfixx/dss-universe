/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Forum (Community Hub)
 * 📄 File: apps/api/src/modules/forum/domain/forum-structure.rules.spec.ts
 *
 * 🎯 Purpose:
 * Verifies structure normalization and category visibility decisions.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { ForumCommandError } from './errors/forum-command.error';
import {
  canSeeCategory,
  normalizeAudienceKeys,
  normalizeCategoryInput,
  normalizeForumInput,
} from './forum-structure.rules';
import type { ForumViewerFacts } from './types/forum-structure.type';

describe('forum structure rules', () => {
  const guest: ForumViewerFacts = {
    subjectId: null,
    audienceKeys: [],
    seesAllCategories: false,
    moderatesAllCategories: false,
    canAssignModerators: false,
  };
  const member: ForumViewerFacts = {
    ...guest,
    subjectId: 'member',
    audienceKeys: ['role:user', 'group:premium'],
  };
  const admin: ForumViewerFacts = {
    ...guest,
    subjectId: 'admin',
    seesAllCategories: true,
  };

  it.each([
    ['PUBLIC', [], guest, true],
    ['MEMBERS', [], guest, false],
    ['MEMBERS', [], member, true],
    ['RESTRICTED', ['group:premium'], guest, false],
    ['RESTRICTED', ['group:premium'], member, true],
    ['RESTRICTED', ['role:moderator'], member, false],
    ['RESTRICTED', [], member, false],
    ['RESTRICTED', [], admin, true],
  ] as const)(
    '%s with audience %j decides visibility',
    (visibility, audienceKeys, viewer, expected) => {
      expect(canSeeCategory({ visibility, audienceKeys }, viewer)).toBe(
        expected,
      );
    },
  );

  it('normalizes audience keys for roles and groups', () => {
    expect(
      normalizeAudienceKeys([
        ' Group:Premium ',
        'role:moderator',
        'group:premium',
      ]),
    ).toEqual(['group:premium', 'role:moderator']);
  });

  it.each(['premium', 'team:x', 'group:', 'role:Admin!', 'group:-x'])(
    'rejects malformed audience key %s',
    (key) => {
      expect(() => normalizeAudienceKeys([key])).toThrow(ForumCommandError);
    },
  );

  const category = {
    slug: ' General ',
    title: '  General talk ',
    description: '  ',
    position: 0,
    visibility: 'PUBLIC' as const,
    audienceKeys: [],
    active: true,
  };

  it('normalizes a category', () => {
    expect(normalizeCategoryInput(category)).toMatchObject({
      slug: 'general',
      title: 'General talk',
      description: null,
    });
  });

  it.each([
    { slug: 'bad slug' },
    { title: 'x' },
    { position: -1 },
    { description: 'x'.repeat(1001) },
    { visibility: 'PUBLIC' as const, audienceKeys: ['group:premium'] },
  ])('rejects invalid category %j', (override) => {
    expect(() => normalizeCategoryInput({ ...category, ...override })).toThrow(
      ForumCommandError,
    );
  });

  it('normalizes forum input', () => {
    expect(
      normalizeForumInput({
        categoryId: 'c',
        parentId: null,
        slug: 'Help-Desk',
        title: ' Help desk ',
        description: null,
        position: 2,
        allowsGatedContent: false,
        active: true,
      }),
    ).toMatchObject({ slug: 'help-desk', title: 'Help desk' });
  });
});
