export const ACCESS_COOKIE = "dss_access_token";
export const REFRESH_COOKIE = "dss_refresh_token";
export const PERSISTENT_SESSION_COOKIE = "dss_session_persistent";

export const ACCESS_TOKEN_MAX_AGE = 60 * 15;
export const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 7;

export type SessionViewer = {
  avatarUrl?: string | null;
  displayName?: string | null;
  id: string;
  username: string;
};

const protectedPrefixes = [
  "/command-deck",
  "/media",
  "/members",
  "/newsroom",
  "/settings",
] as const;

const guestOnlyPaths = new Set(["/login", "/register"]);

export function isProtectedPath(pathname: string): boolean {
  return protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function isGuestOnlyPath(pathname: string): boolean {
  return guestOnlyPaths.has(pathname);
}

export function safeReturnTo(value: string | null | undefined): string {
  if (!value || value.length > 2_048 || !value.startsWith("/")) return "/";
  if (value.startsWith("//") || value.includes("\\")) return "/";

  try {
    const parsed = new URL(value, "https://dss.local");
    if (parsed.origin !== "https://dss.local") return "/";
    if (guestOnlyPaths.has(parsed.pathname)) return "/";
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return "/";
  }
}

export function isAccessTokenFresh(
  token: string | undefined,
  now = Date.now(),
): boolean {
  if (!token) return false;

  try {
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1] ?? "", "base64url").toString("utf8"),
    ) as { exp?: unknown };
    return typeof payload.exp === "number" && payload.exp * 1_000 > now;
  } catch {
    return false;
  }
}

export function sessionCookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    priority: "high" as const,
  };
}
