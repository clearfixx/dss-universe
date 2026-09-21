import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { NewsAttachments } from "./news-attachments";

describe("NewsAttachments", () => {
  it("renders file identity, size, SHA-256 and a download link", () => {
    render(
      <NewsAttachments
        items={[
          {
            id: "reference-1",
            mediaId: "media-1",
            label: "DSS deployment guide",
            filename: "deployment.pdf",
            mimeType: "application/pdf",
            extension: "pdf",
            size: 2_621_440,
            kind: "PDF document",
            checksumSha256: "a".repeat(64),
            checksumSha1: "b".repeat(40),
            checksumMd5: "c".repeat(32),
            downloadUrl: "/api/media/public/media-1/original",
          },
        ]}
      />,
    );

    expect(screen.getByText("DSS deployment guide")).toBeInTheDocument();
    expect(screen.getByText(/PDF document · 2,5 МБ/)).toBeInTheDocument();
    expect(screen.getByText("SHA-256")).toBeInTheDocument();
    expect(screen.getByText("SHA-1")).toBeInTheDocument();
    expect(screen.getByText("MD5")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Завантажити/ })).toHaveAttribute(
      "href",
      "http://localhost:4000/api/media/public/media-1/original",
    );
  });

  it("renders nothing when the article has no attachments", () => {
    const { container } = render(<NewsAttachments items={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
