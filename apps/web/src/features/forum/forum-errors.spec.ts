import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { describe, expect, it } from "vitest";

import { ForumSignInRequired, forumResult, toForumError } from "./forum-errors";

function apiError(code: string, message = "message") {
  return new CombinedGraphQLErrors({
    errors: [{ message, extensions: { code } }],
  });
}

describe("forum errors", () => {
  it("maps API codes to forum codes", () => {
    expect(toForumError(apiError("RATE_LIMITED")).code).toBe("RATE_LIMITED");
    expect(toForumError(apiError("NOT_FOUND")).code).toBe("NOT_FOUND");
    expect(toForumError(apiError("CONFLICT")).code).toBe("CONFLICT");
    expect(toForumError(apiError("UNAUTHENTICATED")).code).toBe(
      "NOT_SIGNED_IN",
    );
    expect(toForumError(apiError("FORBIDDEN", "Only moderators")).code).toBe(
      "ACCESS_DENIED",
    );
  });

  it("recognises read-only mode and keeps its end date", () => {
    expect(
      toForumError(
        apiError(
          "FORBIDDEN",
          "Your account is read-only until 2026-11-28T10:00:00.000Z.",
        ),
      ),
    ).toMatchObject({
      code: "READ_ONLY",
      readOnlyUntil: "2026-11-28T10:00:00.000Z",
    });
  });

  it("shows validation details and hides unknown failures", () => {
    expect(
      toForumError(apiError("BAD_USER_INPUT", "A post cannot be empty.")),
    ).toEqual({ code: "INVALID_INPUT", message: "A post cannot be empty." });
    expect(toForumError(new Error("socket hang up")).code).toBe("UNKNOWN");
    expect(
      toForumError(apiError("INTERNAL_SERVER_ERROR")).message,
    ).not.toContain("message");
  });

  it("wraps actions in a result", async () => {
    await expect(forumResult(() => Promise.resolve(7))).resolves.toEqual({
      ok: true,
      data: 7,
    });
    await expect(
      forumResult(() => Promise.reject(new ForumSignInRequired())),
    ).resolves.toMatchObject({ ok: false, error: { code: "NOT_SIGNED_IN" } });
  });
});
