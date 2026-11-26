import { describeUserAgent, normalizeClientInfo } from './forum-network.rules';

describe('forum network rules', () => {
  it('bounds and cleans the captured client info', () => {
    expect(normalizeClientInfo(undefined)).toEqual({
      ipAddress: null,
      userAgent: null,
    });
    expect(
      normalizeClientInfo({ ipAddress: ' ::ffff:203.0.113.7 ', userAgent: '' }),
    ).toEqual({ ipAddress: '203.0.113.7', userAgent: null });
    expect(
      normalizeClientInfo({ userAgent: 'x'.repeat(600) }).userAgent,
    ).toHaveLength(512);
  });

  it('describes common devices', () => {
    expect(
      describeUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      ),
    ).toEqual({ kind: 'DESKTOP', browser: 'Chrome 131', os: 'Windows' });
    expect(
      describeUserAgent(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1',
      ),
    ).toEqual({ kind: 'MOBILE', browser: 'Safari 18', os: 'iOS' });
    expect(
      describeUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
      ).browser,
    ).toBe('Edge 131');
    expect(
      describeUserAgent(
        'Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 Chrome/130.0 Safari/537.36',
      ).kind,
    ).toBe('TABLET');
    expect(describeUserAgent('curl/8.5.0').kind).toBe('BOT');
    expect(describeUserAgent(null)).toEqual({
      kind: 'UNKNOWN',
      browser: null,
      os: null,
    });
  });
});
