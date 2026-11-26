import { describe, expect, it } from "vitest";

import { rootNode } from "./news-document";

const doc = {
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text: "Hi" }] }],
};

describe("news document root", () => {
  it("unwraps the canonical editor envelope", () => {
    expect(rootNode({ schemaVersion: 1, profile: "NEWS", content: doc })).toBe(
      doc,
    );
  });

  it("keeps a legacy bare root node", () => {
    expect(rootNode(doc)).toBe(doc);
  });
});
