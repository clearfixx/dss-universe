import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { proxy } from "./proxy";

function request(path: string, cookies: Record<string, string> = {}) {
  return new NextRequest(`http://localhost:3000${path}`, {
    headers: {
      cookie: Object.entries(cookies)
        .map(([name, value]) => `${name}=${value}`)
        .join("; "),
    },
  });
}

function token(exp: number) {
  const payload = Buffer.from(JSON.stringify({ exp })).toString("base64url");
  return `header.${payload}.signature`;
}

describe("session proxy", () => {
  afterEach(() => vi.restoreAllMocks());

  it("redirects guests from a protected route and preserves its query", async () => {
    const response = await proxy(request("/newsroom/new?draft=alpha"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login?returnTo=%2Fnewsroom%2Fnew%3Fdraft%3Dalpha",
    );
  });

  it("lets a fresh session enter a protected workspace", async () => {
    const response = await proxy(
      request("/command-deck", {
        dss_access_token: token(Math.floor(Date.now() / 1_000) + 60),
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("returns an authenticated visitor to a safe destination", async () => {
    const response = await proxy(
      request("/login?returnTo=%2Fsettings%2Fprofile", {
        dss_access_token: token(Math.floor(Date.now() / 1_000) + 60),
      }),
    );

    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/settings/profile",
    );
  });

  it("rotates an expired session before rendering the route", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({
        data: {
          refreshTokens: {
            tokens: {
              accessToken: "new-access",
              refreshToken: "new-refresh",
            },
          },
        },
      }),
    );

    const response = await proxy(
      request("/command-deck", {
        dss_access_token: token(Math.floor(Date.now() / 1_000) - 60),
        dss_refresh_token: "old-refresh",
        dss_session_persistent: "1",
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.getSetCookie().join("\n")).toContain(
      "dss_access_token=new-access",
    );
    expect(response.headers.getSetCookie().join("\n")).toContain(
      "dss_refresh_token=new-refresh",
    );
  });

  it("does not destroy a session during a temporary auth outage", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));

    const response = await proxy(
      request("/media", { dss_refresh_token: "refresh" }),
    );

    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login?returnTo=%2Fmedia&reason=unavailable",
    );
    expect(response.headers.getSetCookie()).toHaveLength(0);
  });

  it("renders public routes as a guest during an auth outage", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));

    const response = await proxy(
      request("/news", {
        dss_access_token: token(Math.floor(Date.now() / 1_000) - 60),
        dss_refresh_token: "refresh",
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.getSetCookie().join("\n")).toContain(
      "dss_access_token=;",
    );
    expect(response.headers.getSetCookie().join("\n")).not.toContain(
      "dss_refresh_token=;",
    );
  });
});
