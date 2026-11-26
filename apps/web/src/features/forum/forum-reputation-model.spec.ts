import { describe, expect, it } from "vitest";

import {
  reputationErrorMessage,
  reputationPlace,
  reputationReasonError,
} from "./forum-reputation-model";

const POST = "11111111-1111-4111-8111-111111111111";

describe("forum reputation model", () => {
  it("requires a 3–500 character reason", () => {
    expect(reputationReasonError("  ok ")).not.toBeNull();
    expect(reputationReasonError("Корисна відповідь")).toBeNull();
    expect(reputationReasonError("x".repeat(501))).not.toBeNull();
  });

  it("names the place: post link, deleted post, or profile", () => {
    expect(
      reputationPlace({ type: "FORUM_POST", id: POST, deleted: false }),
    ).toEqual({
      label: "Форум: повідомлення",
      href: `/community/forum/posts/${POST}`,
    });
    expect(
      reputationPlace({ type: "FORUM_POST", id: POST, deleted: true }),
    ).toEqual({ label: "Форум. Повідомлення видалене", href: null });
    expect(reputationPlace(null)).toEqual({ label: "Профіль", href: null });
  });

  it("explains API errors in Ukrainian", () => {
    expect(reputationErrorMessage("CONFLICT", "")).toMatch(/вже змінювали/);
    expect(
      reputationErrorMessage("INVALID_INPUT", "must be at least 7 days old"),
    ).toMatch(/новий/);
  });
});
