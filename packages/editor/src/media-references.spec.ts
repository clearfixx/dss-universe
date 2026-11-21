import { describe, expect, it } from "vitest";
import type { EditorDocument, EditorNode } from "./document";
import { collectEditorMediaIds } from "./media-references";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const C = "33333333-3333-4333-8333-333333333333";

function doc(...content: EditorNode[]): EditorDocument {
  return {
    schemaVersion: 1,
    profile: "NEWS",
    content: { type: "doc", content },
  } as unknown as EditorDocument;
}

describe("collectEditorMediaIds", () => {
  const document = doc(
    { type: "mediaReference", attrs: { mediaId: A } },
    { type: "paragraph", content: [{ type: "text", text: "x" }] },
    {
      type: "contentGate",
      attrs: { gateId: "g" },
      content: [{ type: "attachment", attrs: { mediaId: B } }],
    },
    { type: "attachment", attrs: { mediaId: B } },
    { type: "attachment", attrs: { mediaId: C } },
  );

  it("collects both media node types, inside Content Gates, unique and ordered", () => {
    expect(collectEditorMediaIds(document)).toEqual([A, B, C]);
  });

  it("restricts to the node types an owner claims", () => {
    expect(collectEditorMediaIds(document, ["attachment"])).toEqual([B, C]);
    expect(collectEditorMediaIds(document, ["mediaReference"])).toEqual([A]);
  });

  it("returns an empty set for documents without media", () => {
    expect(collectEditorMediaIds(doc({ type: "paragraph" }))).toEqual([]);
  });
});
