/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: DSS Editor Frontend
 * 📄 File: apps/web/src/features/editor/use-editor-autosave.spec.tsx
 *
 * 🎯 Purpose:
 * Verifies the React adapter delegates versioned snapshots to host persistence.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { createEmptyEditorDocument, type EditorDraftSave } from "@dss/editor";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useEditorAutosave } from "./use-editor-autosave";

function Harness({ save }: { save: EditorDraftSave }) {
  const { snapshot, onDocumentChange, retry } = useEditorAutosave({
    save,
    initialVersion: 3,
    delayMs: 20,
  });
  const [updates, setUpdates] = useState(0);
  return (
    <>
      <span>{`${snapshot.phase}:${snapshot.version}`}</span>
      <button
        type="button"
        onClick={() => {
          const document = createEmptyEditorDocument("COMMENT");
          document.content.content = [
            { type: "paragraph", content: [{ type: "text", text: "Draft" }] },
          ];
          onDocumentChange(document);
          setUpdates((value) => value + 1);
        }}
      >
        Update {updates}
      </button>
      <button type="button" onClick={() => void retry()}>
        Retry
      </button>
    </>
  );
}

describe("useEditorAutosave", () => {
  afterEach(() => vi.useRealTimers());

  it("debounces a canonical snapshot and advances the host version", async () => {
    vi.useFakeTimers();
    const save = vi.fn<EditorDraftSave>().mockResolvedValue({
      version: 4,
      savedAt: "2026-09-13T18:00:00.000Z",
    });
    render(<Harness save={save} />);

    fireEvent.click(screen.getByRole("button", { name: /update/i }));
    expect(screen.getByText("DIRTY:3")).toBeInTheDocument();
    await act(() => vi.advanceTimersByTimeAsync(20));

    expect(save).toHaveBeenCalledTimes(1);
    expect(screen.getByText("SAVED:4")).toBeInTheDocument();
  });
});

/** The hook moves snapshots, never ownership. */
