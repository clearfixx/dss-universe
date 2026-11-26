import { describe, expect, it } from "vitest";

import {
  moderationActionHref,
  moderationActionLabel,
} from "./moderation-actions-model";

describe("moderation actions model", () => {
  it("labels known actions in Ukrainian and keeps unknown ones", () => {
    expect(moderationActionLabel("topic.trashed")).toBe("Переніс тему в кошик");
    expect(moderationActionLabel("post.hidden")).toBe("Приховав допис");
    expect(moderationActionLabel("topic.whatever")).toBe("topic.whatever");
  });

  it("links to the topic, anchored at the post when known", () => {
    expect(moderationActionHref({ topicId: "t", postNumber: null })).toBe(
      "/community/forum/topics/t",
    );
    expect(moderationActionHref({ topicId: "t", postNumber: 4 })).toBe(
      "/community/forum/topics/t#post-4",
    );
  });
});
