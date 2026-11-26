import { describe, expect, it } from "vitest";

import {
  DEFAULT_RANKING,
  hotScore,
  rankHot,
  rankingError,
} from "./ranking-model";

const topic = (
  id: string,
  net: number,
  postCount: number,
  createdAt: string,
) => ({
  id,
  ratingUp: Math.max(net, 0),
  ratingDown: Math.max(-net, 0),
  postCount,
  createdAt,
});

describe("ranking model", () => {
  it("matches the API hot formula", () => {
    const created = "2026-11-20T00:00:00.000Z";
    const expected =
      Math.log10(100) + new Date(created).getTime() / 1000 / 45_000;
    expect(hotScore(topic("a", 100, 1, created), DEFAULT_RANKING)).toBeCloseTo(
      expected,
      9,
    );
  });

  it("lets reply weight lift active discussions", () => {
    const quietButVoted = topic("voted", 10, 1, "2026-11-20T00:00:00Z");
    const busy = topic("busy", 1, 200, "2026-11-20T00:00:00Z");
    expect(rankHot([busy, quietButVoted], DEFAULT_RANKING)[0].id).toBe("voted");
    expect(
      rankHot([quietButVoted, busy], {
        ...DEFAULT_RANKING,
        hotReplyWeight: 2,
      })[0].id,
    ).toBe("busy");
  });

  it("validates the API limits", () => {
    expect(rankingError(DEFAULT_RANKING)).toBeNull();
    expect(
      rankingError({ hotGravitySeconds: 1800, hotReplyWeight: 0 }),
    ).not.toBeNull();
    expect(
      rankingError({ hotGravitySeconds: 3600, hotReplyWeight: 11 }),
    ).not.toBeNull();
  });
});
