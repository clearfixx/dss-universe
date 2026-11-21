import { describe, expect, it } from "vitest";

import {
  forumFirstUnreadNumber,
  forumMemberName,
  forumRatingBreakdown,
  forumScore,
  forumUnreadCount,
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
});
