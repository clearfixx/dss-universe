import { describe, expect, it } from "vitest";
import { validateEditorDocument } from "@dss/editor";

import {
  forumQuoteNode,
  forumQuotedNumbers,
  forumReplyMention,
} from "./forum-quote-model";

const USER = "11111111-1111-4111-8111-111111111111";
const FILE = "22222222-2222-4222-8222-222222222222";
const text = (value: string) => ({ type: "text", text: value });
const paragraph = (value: string) => ({
  type: "paragraph",
  content: [text(value)],
});

const source = (...content: unknown[]) => ({
  postId: "post-1",
  number: 7,
  authorName: "DSS User",
  documentJson: JSON.stringify({ content: { type: "doc", content } }),
});

describe("forum reply and quote", () => {
  it("never copies hidden blocks, files or older quotes", () => {
    const quote = forumQuoteNode(
      source(
        paragraph("видиме"),
        {
          type: "contentGate",
          attrs: { gateId: FILE },
          content: [paragraph("секрет")],
        },
        { type: "blockquote", content: [paragraph("стара цитата")] },
        { type: "mediaReference", attrs: { mediaId: FILE } },
        { type: "attachment", attrs: { mediaId: FILE, label: "a.zip" } },
      ),
    );
    expect(JSON.stringify(quote)).not.toMatch(/секрет|стара|mediaId|gate/);
    expect(quote.content).toEqual([paragraph("видиме")]);
  });

  it("produces a valid reply document", () => {
    const quote = forumQuoteNode(
      source(
        { type: "heading", attrs: { level: 2 }, content: [text("Заголовок")] },
        paragraph("текст"),
      ),
    );
    const document = {
      schemaVersion: 1,
      profile: "FORUM_REPLY",
      content: {
        type: "doc",
        content: [quote, forumReplyMention({ id: USER, username: "user" })],
      },
    };
    expect(validateEditorDocument(document).errors).toEqual([]);
    expect(forumQuotedNumbers(document as never)).toEqual([7]);
  });

  it("explains a quote with nothing to copy", () => {
    const quote = forumQuoteNode(
      source({ type: "mediaReference", attrs: { mediaId: FILE } }),
    );
    expect(JSON.stringify(quote)).toContain("не цитується");
  });
});
