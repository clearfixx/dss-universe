import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ForumDocument } from "./forum-document";

function doc(...content: unknown[]) {
  return JSON.stringify({
    schemaVersion: 1,
    profile: "FORUM_REPLY",
    content: { type: "doc", content },
  });
}

const paragraph = (text: string) => ({
  type: "paragraph",
  content: [{ type: "text", text }],
});

describe("ForumDocument", () => {
  it("renders ordinary blocks", () => {
    render(<ForumDocument documentJson={doc(paragraph("Hello forum"))} />);
    expect(screen.getByText("Hello forum")).toBeInTheDocument();
  });

  it("shows a lock card for a locked hidden block and keeps order", () => {
    render(
      <ForumDocument
        documentJson={doc(
          paragraph("Before"),
          { type: "contentGate", attrs: { gateId: "g" } },
          paragraph("After"),
        )}
      />,
    );
    expect(screen.getByText("Прихований блок.")).toBeInTheDocument();
    expect(screen.getByText("Before")).toBeInTheDocument();
    expect(screen.getByText("After")).toBeInTheDocument();
  });

  it("renders the content of an unlocked hidden block", () => {
    render(
      <ForumDocument
        documentJson={doc({
          type: "contentGate",
          attrs: { gateId: "g" },
          content: [paragraph("Secret benchmark")],
        })}
      />,
    );
    expect(
      screen.getByLabelText("Прихований блок (відкрито)"),
    ).toHaveTextContent("Secret benchmark");
  });

  it("renders nothing for broken JSON", () => {
    const { container } = render(<ForumDocument documentJson="{" />);
    expect(container).toBeEmptyDOMElement();
  });
});
