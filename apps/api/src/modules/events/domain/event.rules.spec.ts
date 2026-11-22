import {
  eventEndsAt,
  isUpcoming,
  validateEvent,
  type EventInput,
} from './event.rules';

const online: EventInput = {
  title: ' Next.js 16 Deep Dive ',
  description: null,
  startsAt: new Date('2026-11-23T18:00:00Z'),
  durationMinutes: 90,
  format: 'ONLINE',
  location: '  ',
  url: ' https://meet.example.com/dss ',
};

describe('event rules', () => {
  it('trims fields and normalises the link', () => {
    expect(validateEvent(online)).toEqual({
      ok: true,
      value: {
        ...online,
        title: 'Next.js 16 Deep Dive',
        location: null,
        url: 'https://meet.example.com/dss',
      },
    });
  });

  it.each([
    [{ title: 'ab' }, /title/],
    [{ durationMinutes: 0 }, /duration/],
    [{ durationMinutes: 7 * 24 * 60 + 1 }, /duration/],
    [{ url: 'javascript:alert(1)' }, /http/],
    [{ url: null }, /needs a link/],
    [{ format: 'OFFLINE' as const, location: null }, /needs a place/],
    [{ startsAt: new Date('nope') }, /start/],
  ])('rejects %o', (change, message) => {
    const result = validateEvent({ ...online, ...change });
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toMatch(message);
  });

  it('accepts an offline event with a place and no link', () => {
    expect(
      validateEvent({
        ...online,
        format: 'OFFLINE',
        location: 'Київ, Арсенал',
        url: null,
      }).ok,
    ).toBe(true);
  });

  it('is upcoming until it ends', () => {
    expect(eventEndsAt(online)).toEqual(new Date('2026-11-23T19:30:00Z'));
    expect(isUpcoming(online, new Date('2026-11-23T19:00:00Z'))).toBe(true);
    expect(isUpcoming(online, new Date('2026-11-23T19:30:00Z'))).toBe(false);
  });
});
