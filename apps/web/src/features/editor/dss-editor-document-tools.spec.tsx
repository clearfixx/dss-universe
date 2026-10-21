/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: DSS Editor Frontend
 * 📄 File: apps/web/src/features/editor/dss-editor-document-tools.spec.tsx
 *
 * 🎯 Purpose:
 * Verifies Knowledge Forge-grade toolbar boundaries and canonical insertion.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { DssEditor } from "./dss-editor";

vi.mock("./editor-actions", () => ({
  createEditorContentGate: vi.fn(),
  runEditorAiCommand: vi.fn(),
  uploadEditorMedia: vi.fn(),
}));

beforeAll(() => {
  Object.defineProperty(Range.prototype, "getClientRects", {
    configurable: true,
    value: () => [],
  });
  Object.defineProperty(Range.prototype, "getBoundingClientRect", {
    configurable: true,
    value: () => new DOMRect(),
  });
});

afterEach(cleanup);

describe("DssEditor document tools", () => {
  it("exposes document-grade tools only for the WIKI profile", async () => {
    const { unmount } = render(<DssEditor profile="WIKI" />);

    expect(
      await screen.findByRole("button", { name: "Insert table" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Insert task list" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Insert footnote" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Insert table of contents" }),
    ).toBeInTheDocument();

    unmount();
    render(<DssEditor profile="NEWS" />);
    expect(
      screen.queryByRole("button", { name: "Insert table" }),
    ).not.toBeInTheDocument();
  });

  it("inserts a canonical table skeleton", async () => {
    const { container } = render(<DssEditor profile="WIKI" />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Insert table" }),
    );

    await waitFor(() => {
      const input = container.querySelector<HTMLInputElement>(
        'input[name="documentJson"]',
      );
      const document = JSON.parse(input?.value ?? "{}") as {
        content?: { content?: Array<{ type?: string }> };
      };
      expect(
        document.content?.content?.some(({ type }) => type === "table"),
      ).toBe(true);
    });
  });

  it("persists task checkbox changes in canonical JSON", async () => {
    const { container } = render(<DssEditor profile="WIKI" />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Insert task list" }),
    );
    const checkbox = await screen.findByRole("checkbox", {
      name: "Toggle task",
    });
    fireEvent.click(checkbox);

    await waitFor(() => {
      const input = container.querySelector<HTMLInputElement>(
        'input[name="documentJson"]',
      );
      expect(input?.value).toContain('"checked":true');
    });
  });
});

/** Document-grade tools stay narrow, typed and reusable across future owners. */
