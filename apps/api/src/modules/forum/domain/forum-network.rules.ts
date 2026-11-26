/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Forum (Community Hub)
 * 📄 File: apps/api/src/modules/forum/domain/forum-network.rules.ts
 *
 * 🎯 Purpose:
 * Pure rules of post network metadata (P1 B11): bounded capture of the
 * client address and User-Agent, and a coarse device description for staff.
 *
 * ⚠️ Important:
 * The description is a hint for moderators, not identification; unknown
 * agents stay "Невідомо". No geolocation is derived here.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export type ForumClientInfo = Readonly<{
  ipAddress?: string | null;
  userAgent?: string | null;
}>;

export type ForumDeviceKind =
  | 'DESKTOP'
  | 'MOBILE'
  | 'TABLET'
  | 'BOT'
  | 'UNKNOWN';

export type ForumDeviceInfo = Readonly<{
  kind: ForumDeviceKind;
  browser: string | null;
  os: string | null;
}>;

/** Trims and bounds what is stored; empty values become null. */
export function normalizeClientInfo(client: ForumClientInfo | undefined): {
  ipAddress: string | null;
  userAgent: string | null;
} {
  const ip = client?.ipAddress?.trim().replace(/^::ffff:/, '') ?? '';
  const ua = client?.userAgent?.trim() ?? '';
  return {
    ipAddress: ip ? ip.slice(0, 64) : null,
    userAgent: ua ? ua.slice(0, 512) : null,
  };
}

const BROWSERS: ReadonlyArray<[RegExp, string]> = [
  [/Edg(?:e|A|iOS)?\/(\d+)/, 'Edge'],
  [/OPR\/(\d+)/, 'Opera'],
  [/SamsungBrowser\/(\d+)/, 'Samsung Internet'],
  [/Firefox\/(\d+)|FxiOS\/(\d+)/, 'Firefox'],
  [/Chrome\/(\d+)|CriOS\/(\d+)/, 'Chrome'],
  [/Version\/(\d+)[^ ]* (?:Mobile\/\S+ )?Safari\//, 'Safari'],
];

const SYSTEMS: ReadonlyArray<[RegExp, string]> = [
  [/Windows NT/, 'Windows'],
  [/iPhone|iPad|iPod/, 'iOS'],
  [/Android/, 'Android'],
  [/CrOS/, 'ChromeOS'],
  [/Mac OS X|Macintosh/, 'macOS'],
  [/Linux/, 'Linux'],
];

export function describeUserAgent(userAgent: string | null): ForumDeviceInfo {
  if (!userAgent) return { kind: 'UNKNOWN', browser: null, os: null };
  if (
    /bot|crawler|spider|curl\/|wget\/|python-requests|httpclient/i.test(
      userAgent,
    )
  ) {
    return { kind: 'BOT', browser: null, os: null };
  }
  let browser: string | null = null;
  for (const [pattern, name] of BROWSERS) {
    const match = pattern.exec(userAgent);
    if (match) {
      const version = match.slice(1).find(Boolean);
      browser = version ? `${name} ${version}` : name;
      break;
    }
  }
  const os = SYSTEMS.find(([pattern]) => pattern.test(userAgent))?.[1] ?? null;
  const kind: ForumDeviceKind =
    /iPad|Tablet/.test(userAgent) ||
    (/Android/.test(userAgent) && !/Mobile/.test(userAgent))
      ? 'TABLET'
      : /Mobi|iPhone|iPod/.test(userAgent)
        ? 'MOBILE'
        : browser || os
          ? 'DESKTOP'
          : 'UNKNOWN';
  return { kind, browser, os };
}
