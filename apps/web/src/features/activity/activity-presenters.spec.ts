import { describe, expect, it } from "vitest";

import { fallbackActivityTitle, presentActivity } from "./activity-presenters";

const TOPIC = "11111111-1111-4111-8111-111111111111";
const item = (action: string, subjectType: string, subjectId = TOPIC) => ({
  module: "forum",
  action,
  subjectType,
  subjectId,
});

describe("activity presenters (P1 A13)", () => {
  it("presents forum events in Ukrainian with topic links", () => {
    expect(
      presentActivity(item("forum.topic.created.v1", "ForumTopic")),
    ).toEqual({
      title: "Створив тему",
      href: `/community/forum/topics/${TOPIC}`,
    });
    expect(presentActivity(item("forum.post.created.v1", "ForumPost"))).toEqual(
      {
        title: "Відповів на форумі",
        href: `/community/forum/posts/${TOPIC}`,
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

  it("never links without a real id", () => {
    expect(
      presentActivity(item("forum.post.created.v1", "ForumPost", "../x")).href,
    ).toBeNull();
    expect(
      presentActivity(item("forum.topic.created.v1", "ForumThing")).href,
    ).toBeNull();
    expect(
      presentActivity(item("forum.topic.created.v1", "ForumTopic", "")).href,
    ).toBeNull();
    expect(
      presentActivity(item("forum.topic.created.v1", "ForumTopic", "../x"))
        .href,
    ).toBeNull();
    expect(
      presentActivity(item("forum.something.v1", "ForumTopic")).title,
    ).toBe("Forum Something");
  });
});
