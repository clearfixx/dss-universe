import { describe, expect, it } from "vitest";

import { activeCommandDeckHref } from "@/components/command-deck/command-deck-navigation";

import { isLocked, lockRow } from "./community-hub-admin-kit";
import { toForumInput, type ForumDraft } from "./community-hub-admin-model";

const all = {
  view: true,
  read: true,
  createTopics: true,
  reply: true,
  editOwn: true,
  deleteOwn: true,
  moderate: true,
};

describe("Command Deck community hub settings", () => {
  it("locks the matrix the same way as the API", () => {
    expect(lockRow({ role: "GUEST", ...all })).toEqual({
      role: "GUEST",
      view: true,
      read: true,
      createTopics: false,
      reply: false,
      editOwn: false,
      deleteOwn: false,
      moderate: false,
    });
    expect(
      lockRow({ role: "ADMIN", ...all, moderate: false, view: false }),
    ).toEqual({ role: "ADMIN", ...all });
    expect(lockRow({ role: "MEMBER", ...all, view: false }).reply).toBe(false);
    expect(isLocked("GUEST", "reply")).toBe(true);
    expect(isLocked("GUEST", "read")).toBe(false);
    expect(isLocked("ADMIN", "view")).toBe(true);
    expect(isLocked("MEMBER", "moderate")).toBe(false);
  });

  it("drops the id when sending a forum draft", () => {
    const draft = { id: "f1", title: "Web" } as unknown as ForumDraft;
    expect(toForumInput(draft)).toEqual({ title: "Web" });
  });

  it("highlights the deepest admin entry", () => {
    expect(activeCommandDeckHref("/command-deck")).toBe("/command-deck");
    expect(
      activeCommandDeckHref("/command-deck/community-hub/sections/abc"),
    ).toBe("/command-deck/community-hub");
    expect(activeCommandDeckHref("/command-deckish")).toBe(null);
    expect(activeCommandDeckHref("/command-deck/gamification/xp-rules")).toBe(
      "/command-deck/community-hub",
    );
  });
});
