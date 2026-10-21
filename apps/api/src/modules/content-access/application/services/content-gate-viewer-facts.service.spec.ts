/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Content Access
 * 📄 File: apps/api/src/modules/content-access/application/services/content-gate-viewer-facts.service.spec.ts
 *
 * 🎯 Purpose:
 * Pins active-account short-circuit, exact age math, scalar evidence and failure propagation.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { ContentGateViewerFactsService } from './content-gate-viewer-facts.service';
describe('ContentGateViewerFactsService', () => {
  const now = new Date('2026-10-14T12:00:00Z');
  const accounts = { find: jest.fn() };
  const comments = { countByAuthor: jest.fn() };
  const reputation = { totalFor: jest.fn() };
  const service = new ContentGateViewerFactsService(
    accounts,
    comments,
    reputation,
  );
  beforeEach(() => {
    jest.resetAllMocks();
    accounts.find.mockResolvedValue({
      active: true,
      createdAt: new Date('2026-10-10T12:00:01Z'),
      groups: ['premium'],
      passwordHash: 'must not escape',
    });
    comments.countByAuthor.mockResolvedValue(12);
    reputation.totalFor.mockResolvedValue(-3);
  });
  it('returns only five statistics, floors days and retains explicit zero placeholders', async () => {
    expect(await service.read('subject', now)).toEqual({
      accountAgeDays: 3,
      comments: 12,
      forumPosts: 0,
      publications: 0,
      reputation: -3,
    });
    expect(accounts.find.mock.calls).toEqual([['subject']]);
    expect(comments.countByAuthor.mock.calls).toEqual([['subject']]);
    expect(reputation.totalFor.mock.calls).toEqual([['subject']]);
  });
  it.each([null, { active: false, createdAt: now }])(
    'does not read ledgers for unavailable account %p',
    async (account) => {
      accounts.find.mockResolvedValue(account);
      expect(await service.read('subject', now)).toBeNull();
      expect(comments.countByAuthor).not.toHaveBeenCalled();
      expect(reputation.totalFor).not.toHaveBeenCalled();
    },
  );
  it.each([
    ['2026-10-14T12:00:01Z', 0],
    ['2026-10-13T12:00:00Z', 1],
    ['2026-10-13T12:00:01Z', 0],
    ['2026-10-12T12:00:00Z', 2],
  ])('preserves age math at %s', async (createdAt, age) => {
    accounts.find.mockResolvedValue({
      active: true,
      createdAt: new Date(createdAt),
    });
    expect((await service.read('subject', now))?.accountAgeDays).toBe(age);
  });
  it.each(['account', 'comments', 'reputation'])(
    'propagates %s evidence errors without bypass or defaults',
    async (owner) => {
      if (owner === 'account')
        accounts.find.mockRejectedValue(new Error('Unavailable'));
      if (owner === 'comments')
        comments.countByAuthor.mockRejectedValue(new Error('Unavailable'));
      if (owner === 'reputation')
        reputation.totalFor.mockRejectedValue(new Error('Unavailable'));
      await expect(service.read('subject', now)).rejects.toThrow('Unavailable');
      if (owner === 'account') {
        expect(comments.countByAuthor).not.toHaveBeenCalled();
        expect(reputation.totalFor).not.toHaveBeenCalled();
      }
    },
  );
});
