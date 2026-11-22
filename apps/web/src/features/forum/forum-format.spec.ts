import { describe, expect, it } from "vitest";

import {
  forumCount,
  forumFirstUnreadNumber,
  forumMemberName,
  forumPlural,
  forumRatingBreakdown,
  forumScore,
  forumUnreadCount,
  forumWhen,
} from "./forum-format";

describe("forum display rules", () => {
  it("shows the net score and the up/down breakdown", () => {
    const rating = { ratingUp: 80, ratingDown: 10 };
    expect(forumScore(rating)).toBe(70);
    expect(forumRatingBreakdown(rating)).toBe("80+ / 10−");
    expect(forumScore({ ratingUp: 1, ratingDown: 5 })).toBe(-4);
  });

  it("prefers the display name and survives missing members", () => {
    expect(
      forumMemberName({ username: "nova", displayName: "Alex Nova" }),
    ).toBe("Alex Nova");
    expect(forumMemberName({ username: "nova", displayName: "  " })).toBe(
      "nova",
    );
    expect(forumMemberName(null)).toBe("Видалений учасник");
  });

  it("counts unread posts for signed-in viewers only", () => {
    expect(forumUnreadCount({ lastPostNumber: 9 })).toBeNull();
    expect(
      forumUnreadCount({ lastPostNumber: 9, viewerLastReadNumber: 4 }),
    ).toBe(5);
    expect(
      forumFirstUnreadNumber({ lastPostNumber: 9, viewerLastReadNumber: 4 }),
    ).toBe(5);
    expect(
      forumFirstUnreadNumber({ lastPostNumber: 9, viewerLastReadNumber: 9 }),
    ).toBeNull();
  });

  it("picks Ukrainian plural forms", () => {
    const forms = ["тема", "теми", "тем"] as const;
    expect(
      [1, 2, 5, 11, 12, 21, 24, 111].map((n) => forumPlural(n, forms)),
    ).toEqual(["тема", "теми", "тем", "тем", "тем", "тема", "теми", "тем"]);
  });

  it("formats counters and list dates like the mockups", () => {
    expect(forumCount(980)).toBe("980");
    expect(forumCount(12_400)).toBe("12.4K");
    const now = new Date(2026, 10, 22, 15, 0);
    expect(forumWhen(new Date(2026, 10, 22, 11, 47), now)).toMatch(
      /^сьогодні, 11:47$/,
    );
    expect(forumWhen(new Date(2026, 10, 21, 18, 6), now)).toMatch(
      /^вчора, 18:06$/,
    );
    expect(forumWhen(new Date(2026, 9, 10, 9, 14), now)).toMatch(
      /^10 жовт.?, 09:14$/,
    );
  });
});
