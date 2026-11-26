import { describe, expect, it } from "vitest";

import { fallbackActivityTitle, presentActivity } from "./activity-presenters";

const item = (action: string, subjectType: string, subjectId = "t1") => ({
  module: "forum",
  action,
  subjectType,
  subjectId,
});

describe("activity presenters (P1 A13)", () => {
  it("presents forum events in Ukrainian with topic links", () => {
    expect(
      presentActivity(item("forum.topic.created.v1", "ForumTopic")),
    ).toEqual({ title: "Створив тему", href: "/community/forum/topics/t1" });
    expect(presentActivity(item("forum.post.created.v1", "ForumPost"))).toEqual(
      {
        title: "Відповів на форумі",
        href: null,
      },
    );
    expect(
      presentActivity(item("forum.answer.credited.v1", "ForumTopic")).title,
    ).toBe("Відповідь прийнята");
  });

  it("falls back to a readable name for other modules", () => {
    expect(
      presentActivity({
        module: "users",
        action: "users.profile-wall.post-created.v1",
        subjectType: "WallPost",
        subjectId: "w",
      }),
    ).toEqual({ title: "Users Profile Wall Post Created", href: null });
    expect(fallbackActivityTitle("news.published")).toBe("News Published");
  });
});
