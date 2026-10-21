/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: DSS Editor Frontend
 * 📄 File: apps/web/src/features/editor/editor-content-gate-dialog.spec.tsx
 *
 * 🎯 Purpose:
 * Verifies custom Content Gate policy composition and immutable ID selection.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createEditorContentGate } from "./editor-actions";
import { EditorContentGateDialog } from "./editor-content-gate-dialog";

vi.mock("./editor-actions", () => ({
  createEditorContentGate: vi.fn(),
}));

describe("EditorContentGateDialog", () => {
  it("persists ALL requirements and returns the gate ID", async () => {
    vi.mocked(createEditorContentGate).mockResolvedValue({ id: "gate-1" });
    const select = vi.fn();
    render(<EditorContentGateDialog onClose={vi.fn()} onSelect={select} />);

    fireEvent.change(screen.getByLabelText("Required value"), {
      target: { value: "40" },
    });
    fireEvent.click(screen.getByText("Add requirement"));
    fireEvent.click(screen.getByText("Create gate"));

    await waitFor(() =>
      expect(createEditorContentGate).toHaveBeenCalledWith({
        operator: "ALL",
        requirements: [
          { kind: "ACCOUNT_AGE_DAYS", threshold: 40 },
          { kind: "COMMENTS", threshold: 1 },
        ],
      }),
    );
    expect(select).toHaveBeenCalledWith("gate-1");
  });
});

/** A tested lock is preferable to a very confident padlock icon. */
