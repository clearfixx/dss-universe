/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: DSS Editor Frontend
 * 📄 File: apps/web/src/features/editor/editor-draft-recovery.spec.tsx
 *
 * 🎯 Purpose:
 * Verifies that recovery requires an explicit restore or discard decision.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { EditorDraftRecovery } from "./editor-draft-recovery";

describe("EditorDraftRecovery", () => {
  it("shows private draft context and exposes separate decisions", () => {
    const restore = vi.fn();
    const discard = vi.fn();
    render(
      <EditorDraftRecovery
        updatedAt="2026-09-13T18:00:00.000Z"
        preview="An unfinished but excellent thought"
        onRestore={restore}
        onDiscard={discard}
      />,
    );

    expect(screen.getByText(/excellent thought/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /restore/i }));
    expect(restore).toHaveBeenCalledTimes(1);
    expect(discard).not.toHaveBeenCalled();
  });
});

/** Restore and discard are different buttons for a very good reason. */
