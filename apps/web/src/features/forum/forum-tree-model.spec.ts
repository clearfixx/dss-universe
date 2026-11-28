import { describe, expect, it } from "vitest";

import { sectionPaths, sectionTotals } from "./forum-tree-model";

const section = (
  topics: number,
  replies: number,
  lastPostAt: string | null,
  showCounts = true,
) => ({
  showCounts,
  activity: {
    topicCount: topics,
    replyCount: replies,
    lastActivity: lastPostAt ? { lastPostAt } : null,
  },
});

describe("forum section tree", () => {
  it("adds subforums to the section and picks the newest activity", () => {
    expect(
      sectionTotals(section(1, 2, "2026-11-01T10:00:00Z"), [
        section(3, 4, "2026-11-03T10:00:00Z"),
        section(5, 6, null),
      ]),
    ).toEqual({
      counts: { topics: 9, replies: 12 },
      latest: { lastPostAt: "2026-11-03T10:00:00Z" },
    });
  });

  it("keeps a subforum with hidden counters out of the totals", () => {
    expect(
      sectionTotals(section(1, 2, null), [section(30, 40, null, false)]).counts,
    ).toEqual({ topics: 1, replies: 2 });
  });

  it("shows no counters when the section switches them off", () => {
    expect(
      sectionTotals(section(1, 2, null, false), [section(3, 4, null)]).counts,
    ).toBeNull();
  });

  it("names the full way to every section", () => {
    const paths = sectionPaths([
      {
        id: "c",
        title: "Web",
        forums: [
          { id: "f", title: "Next", subforums: [{ id: "s", title: "FAQ" }] },
        ],
      },
    ]);
    expect(paths.map((item) => item.path)).toEqual([
      "Web › Next",
      "Web › Next › FAQ",
    ]);
    expect(paths[1].parent?.id).toBe("f");
  });
});
