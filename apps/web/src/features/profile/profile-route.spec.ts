import { describe, expect, it } from "vitest";
import { profileRoutePath } from "./profile-route";

describe("profile route boundary", () => {
  it("builds one canonical segment for expected usernames", () => {
    expect(profileRoutePath("andrii")).toBe("/profile/andrii");
    expect(profileRoutePath("dss_user-1")).toBe("/profile/dss_user-1");
    expect(profileRoutePath("Développeur")).toBe("/profile/D%C3%A9veloppeur");
  });

  it.each([
    "", ".", "..", "foo/bar", "/command-deck", "../settings",
    "abc\\def", "x?y", "x#y", "x%2Fy", "x\nadmin",
    " name", "name ", "a".repeat(81),
  ])("refuses malformed or cross-route username %s", (input) => {
    expect(() => profileRoutePath(input)).toThrow("Invalid profile username.");
  });
});
