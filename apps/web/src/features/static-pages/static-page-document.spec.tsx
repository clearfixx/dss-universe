import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { safeHref, StaticPageDocument } from "./static-page-document";

const html = (content: unknown[]) =>
  renderToStaticMarkup(
    <StaticPageDocument
      documentJson={JSON.stringify({ content: { type: "doc", content } })}
      fileUrl={(id) => `/files/${id}`}
    />,
  );

describe("static page document", () => {
  it("links the table of contents to headings and numbers footnotes", () => {
    const out = html([
      { type: "tableOfContents" },
      {
        type: "heading",
        attrs: { level: 2 },
        content: [{ type: "text", text: "Rules" }],
      },
      {
        type: "paragraph",
        content: [{ type: "footnoteReference", attrs: { noteId: "n" } }],
      },
      { type: "footnoteDefinition", attrs: { noteId: "n" } },
    ]);
    expect(out).toContain('href="#section-1"');
    expect(out).toContain('id="section-1"');
    expect(out).toContain('href="#note-1"');
    expect(out).toContain('id="note-1"');
  });

  it("serves images and attachments through the page file route", () => {
    const out = html([
      { type: "mediaReference", attrs: { mediaId: "a", alt: "Map" } },
      { type: "attachment", attrs: { mediaId: "b", label: "Doc" } },
    ]);
    expect(out).toContain('src="/files/a"');
    expect(out).toContain('href="/files/b"');
  });

  it("renders tables and refuses unsafe links", () => {
    const out = html([
      {
        type: "table",
        content: [
          { type: "tableRow", content: [{ type: "tableCell", content: [] }] },
        ],
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "bad",
            marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }],
          },
        ],
      },
    ]);
    expect(out).toContain("<table");
    expect(out).not.toContain("javascript:");
    expect(safeHref("//evil.test")).toBeNull();
    expect(safeHref("/pages/rules")).toBe("/pages/rules");
    expect(safeHref("mailto:a@b.test")).toBe("mailto:a@b.test");
  });
});
