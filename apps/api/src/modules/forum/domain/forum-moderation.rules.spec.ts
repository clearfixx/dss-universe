/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Forum (Community Hub)
 * 📄 File: apps/api/src/modules/forum/domain/forum-moderation.rules.spec.ts
 *
 * 🎯 Purpose:
 * Verifies CH-1b moderation rules and staff role resolution.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { ForumCommandError } from './errors/forum-command.error';
import {
  canModeratePost,
  normalizeModerationReason,
  normalizeStaffNote,
  staffRole,
  TOPIC_MODERATION_TRANSITIONS,
} from './forum-moderation.rules';
import type { ForumViewerFacts } from './types/forum-structure.type';

describe('forum moderation rules', () => {
  const viewer: ForumViewerFacts = {
    subjectId: 'u',
    audienceKeys: [],
    seesAllCategories: false,
    moderatesAllCategories: false,
    canAssignModerators: false,
    canPurgeContent: false,
  };
  const member = { id: 'u', moderator: false, curator: false };
  const curator = { ...member, curator: true };
  const moderator = { ...member, moderator: true };
  const reply = { number: 2, state: 'VISIBLE' as const };

  it('resolves the highest staff role', () => {
    expect(staffRole({ ...viewer, seesAllCategories: true }, member)).toBe(
      'ADMINISTRATOR',
    );
    expect(staffRole({ ...viewer, moderatesAllCategories: true }, member)).toBe(
      'SUPERMODERATOR',
    );
    expect(staffRole(viewer, moderator)).toBe('MODERATOR');
    expect(staffRole(viewer, curator)).toBe('CURATOR');
    expect(staffRole(viewer, member)).toBeNull();
  });

  it('lets curators and moderators hide, delete and restore replies only', () => {
    expect(canModeratePost(reply, curator, 'HIDDEN')).toBe(true);
    expect(canModeratePost(reply, moderator, 'DELETED')).toBe(true);
    expect(canModeratePost(reply, member, 'DELETED')).toBe(false);
    expect(
      canModeratePost({ number: 1, state: 'VISIBLE' }, moderator, 'DELETED'),
    ).toBe(false);
    expect(
      canModeratePost({ number: 2, state: 'HIDDEN' }, moderator, 'VISIBLE'),
    ).toBe(true);
    expect(
      canModeratePost({ number: 2, state: 'HIDDEN' }, moderator, 'DELETED'),
    ).toBe(true);
    expect(
      canModeratePost({ number: 2, state: 'DELETED' }, moderator, 'HIDDEN'),
    ).toBe(false);
    expect(
      canModeratePost({ number: 2, state: 'PURGED' }, moderator, 'VISIBLE'),
    ).toBe(false);
    expect(canModeratePost(reply, moderator, 'VISIBLE')).toBe(false);
  });

  it('defines topic moving transitions', () => {
    expect(TOPIC_MODERATION_TRANSITIONS.ARCHIVE).toEqual(['OPEN', 'CLOSED']);
    expect(TOPIC_MODERATION_TRANSITIONS.TRASH).toContain('ARCHIVED');
    expect(TOPIC_MODERATION_TRANSITIONS.RESTORE).toEqual(['TRASHED']);
  });

  it('validates reasons and staff notes', () => {
    expect(normalizeModerationReason('  Off-topic ')).toBe('Off-topic');
    expect(() => normalizeModerationReason('no')).toThrow(ForumCommandError);
    expect(normalizeStaffNote(' Edited by moderator ')).toBe(
      'Edited by moderator',
    );
    expect(() => normalizeStaffNote('   ')).toThrow(ForumCommandError);
    expect(() => normalizeStaffNote('x'.repeat(2001))).toThrow(
      ForumCommandError,
    );
  });
});
