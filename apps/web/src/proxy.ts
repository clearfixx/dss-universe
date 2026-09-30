import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  ACCESS_COOKIE,
  ACCESS_TOKEN_MAX_AGE,
  isAccessTokenFresh,
  isGuestOnlyPath,
  isProtectedPath,
  PERSISTENT_SESSION_COOKIE,
  REFRESH_COOKIE,
  REFRESH_TOKEN_MAX_AGE,
  safeReturnTo,
  sessionCookieOptions,
} from "@/features/auth/session-contract";

type RefreshedSession = {
  accessToken: string;
  refreshToken: string;
};

type RefreshResult =
  | { status: "refreshed"; session: RefreshedSession }
  | { status: "rejected" | "unavailable" };

const REFRESH_MUTATION = `
  mutation RefreshSession($input: RefreshTokenInput!) {
    refreshTokens(input: $input) {
      tokens { accessToken refreshToken }
    }
  }
`;

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const protectedRoute = isProtectedPath(pathname);
  const guestOnlyRoute = isGuestOnlyPath(pathname);
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  const hasSessionCookie = Boolean(
    accessToken ||
    request.cookies.has(REFRESH_COOKIE) ||
    request.cookies.has(PERSISTENT_SESSION_COOKIE),
  );

  if (isAccessTokenFresh(accessToken)) {
    return guestOnlyRoute
      ? NextResponse.redirect(
          new URL(
            safeReturnTo(request.nextUrl.searchParams.get("returnTo")),
            request.url,
          ),
        )
      : NextResponse.next();
  }

  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  if (refreshToken) {
    const refresh = await refreshSession(refreshToken);
    if (refresh.status === "refreshed") {
      const destination = safeReturnTo(
        request.nextUrl.searchParams.get("returnTo"),
      );
      const response = guestOnlyRoute
        ? NextResponse.redirect(new URL(destination, request.url))
        : nextWithSession(request, refresh.session);
      writeSessionCookies(
        response,
        refresh.session,
        request.cookies.has(PERSISTENT_SESSION_COOKIE),
      );
      return response;
    }

    if (refresh.status === "unavailable") {
      return protectedRoute
        ? redirectToLogin(request, `${pathname}${search}`, "unavailable")
        : nextWithoutAccess(request);
    }
  }

  if (protectedRoute) {
    const response = redirectToLogin(request, `${pathname}${search}`);
    if (hasSessionCookie) clearSessionCookies(response);
    return response;
  }

  const response = NextResponse.next();
  if (accessToken || refreshToken) clearSessionCookies(response);
  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};

async function refreshSession(refreshToken: string): Promise<RefreshResult> {
  try {
    const response = await fetch(
      process.env.NEXT_PUBLIC_GRAPHQL_URL ??
        "http://localhost:4000/api/graphql",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(8_000),
        body: JSON.stringify({
          query: REFRESH_MUTATION,
          variables: { input: { refreshToken } },
        }),
      },
    );

    if (response.status >= 500) return { status: "unavailable" };
    const body = (await response.json()) as {
      data?: { refreshTokens?: { tokens?: RefreshedSession } };
      errors?: unknown[];
    };
    const session = body.data?.refreshTokens?.tokens;
    if (!response.ok || body.errors?.length || !session) {
      return { status: "rejected" };
    }
    return { status: "refreshed", session };
  } catch {
    return { status: "unavailable" };
  }
}

function nextWithSession(request: NextRequest, session: RefreshedSession) {
  const headers = new Headers(request.headers);
  const cookies = request.cookies
    .getAll()
    .filter(({ name }) => name !== ACCESS_COOKIE && name !== REFRESH_COOKIE)
    .map(({ name, value }) => `${name}=${value}`);
  cookies.push(`${ACCESS_COOKIE}=${session.accessToken}`);
  cookies.push(`${REFRESH_COOKIE}=${session.refreshToken}`);
  headers.set("cookie", cookies.join("; "));
  return NextResponse.next({ request: { headers } });
}

function nextWithoutAccess(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set(
    "cookie",
    request.cookies
      .getAll()
      .filter(({ name }) => name !== ACCESS_COOKIE)
      .map(({ name, value }) => `${name}=${value}`)
      .join("; "),
  );
  const response = NextResponse.next({ request: { headers } });
  response.cookies.delete(ACCESS_COOKIE);
  return response;
}

function writeSessionCookies(
  response: NextResponse,
  session: RefreshedSession,
  persistent: boolean,
) {
  const options = sessionCookieOptions(process.env.NODE_ENV === "production");
  response.cookies.set(ACCESS_COOKIE, session.accessToken, {
    ...options,
    maxAge: ACCESS_TOKEN_MAX_AGE,
  });
  response.cookies.set(REFRESH_COOKIE, session.refreshToken, {
    ...options,
    ...(persistent ? { maxAge: REFRESH_TOKEN_MAX_AGE } : {}),
  });
  if (persistent) {
    response.cookies.set(PERSISTENT_SESSION_COOKIE, "1", {
      ...options,
      maxAge: REFRESH_TOKEN_MAX_AGE,
    });
  }
}

function clearSessionCookies(response: NextResponse) {
  response.cookies.delete(ACCESS_COOKIE);
  response.cookies.delete(REFRESH_COOKIE);
  response.cookies.delete(PERSISTENT_SESSION_COOKIE);
}

function redirectToLogin(
  request: NextRequest,
  returnTo: string,
  reason?: "unavailable",
) {
  const login = new URL("/login", request.url);
  login.searchParams.set("returnTo", safeReturnTo(returnTo));
  if (reason) login.searchParams.set("reason", reason);
  return NextResponse.redirect(login);
}
