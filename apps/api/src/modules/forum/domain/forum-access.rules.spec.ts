import {
  DEFAULT_FORUM_ACCESS,
  effectiveAccess,
  forumAccessRole,
  normalizeAccessGrant,
  normalizeAccessMatrix,
  viewerGrant,
  type ForumAccessGrant,
} from './forum-access.rules';

const yes: ForumAccessGrant = {
  view: true,
  read: true,
  createTopics: true,
  reply: true,
  editOwn: true,
  deleteOwn: true,
  moderate: true,
};
const no: ForumAccessGrant = {
  view: false,
  read: false,
  createTopics: false,
  reply: false,
  editOwn: false,
  deleteOwn: false,
  moderate: false,
};
const member = {
  subjectId: 'u1',
  moderatesAllCategories: false,
  seesAllCategories: false,
};

describe('forum access rules', () => {
  it('maps IAM roles to the highest forum role', () => {
    expect(forumAccessRole(null, ['admin'])).toBe('GUEST');
    expect(forumAccessRole('u', ['user'])).toBe('MEMBER');
    expect(forumAccessRole('u', ['user', 'contributor'])).toBe('CONTRIBUTOR');
    expect(forumAccessRole('u', ['contributor', 'moderator'])).toBe(
      'MODERATOR',
    );
    expect(forumAccessRole('u', ['owner'])).toBe('ADMIN');
  });

  it('locks guests out of writing and admins into everything', () => {
    expect(normalizeAccessGrant('GUEST', yes)).toEqual({
      ...no,
      view: true,
      read: true,
    });
    expect(normalizeAccessGrant('ADMIN', no)).toEqual(yes);
    expect(normalizeAccessGrant('MEMBER', { ...yes, view: false })).toEqual(no);
    expect(
      normalizeAccessGrant('MEMBER', { ...yes, read: false }).createTopics,
    ).toBe(false);
  });

  it('requires one row per role', () => {
    const rows = Object.entries(DEFAULT_FORUM_ACCESS).map(([role, grant]) => ({
      role,
      ...grant,
    }));
    expect(normalizeAccessMatrix(rows)).toEqual(DEFAULT_FORUM_ACCESS);
    expect(() => normalizeAccessMatrix(rows.slice(1))).toThrow(/every/);
    expect(() => normalizeAccessMatrix([...rows, rows[0]])).toThrow(/once/);
    expect(() => normalizeAccessMatrix([{ role: 'OWNER', ...yes }])).toThrow(
      /Unknown/,
    );
  });

  it('inherits forum, then parent, then category, then defaults', () => {
    const closed = { ...DEFAULT_FORUM_ACCESS, MEMBER: no };
    expect(effectiveAccess([null, closed, DEFAULT_FORUM_ACCESS])).toBe(closed);
    expect(effectiveAccess([null, undefined])).toBe(DEFAULT_FORUM_ACCESS);
  });

  it('gives supermoderators and structure managers every right', () => {
    const closed = {
      ...DEFAULT_FORUM_ACCESS,
      MODERATOR: no,
    };
    expect(
      viewerGrant(
        { ...member, accessRole: 'MODERATOR', moderatesAllCategories: true },
        closed,
      ),
    ).toEqual(yes);
    expect(viewerGrant({ ...member, seesAllCategories: true }, closed)).toEqual(
      yes,
    );
    expect(viewerGrant({ ...member, accessRole: 'MODERATOR' }, closed)).toEqual(
      no,
    );
    expect(
      viewerGrant({ ...member, subjectId: null, accessRole: 'ADMIN' }, closed),
    ).toEqual(DEFAULT_FORUM_ACCESS.GUEST);
  });
});
