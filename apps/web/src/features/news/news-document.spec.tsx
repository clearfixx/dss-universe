import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { NewsDocument } from "./news-document";

afterEach(cleanup);

describe("NewsDocument", () => {
  it("renders validated editor JSON without injecting HTML", () => {
    render(
      <NewsDocument
        documentJson={JSON.stringify({
          type: "doc",
          content: [
            {
              type: "heading",
              attrs: { level: 2 },
              content: [{ type: "text", text: "Сигнал" }],
            },
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Безпечний текст",
                  marks: [{ type: "bold" }],
                },
              ],
            },
          ],
        })}
      />,
    );
    expect(screen.getByRole("heading", { name: "Сигнал" })).toBeInTheDocument();
    expect(screen.getByText("Безпечний текст").tagName).toBe("STRONG");
  });

  it("fails closed for malformed JSON", () => {
    render(<NewsDocument documentJson="{" />);
    expect(screen.getByText(/Не вдалося відобразити/)).toBeInTheDocument();
  });
});
