/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 🤖 Module: DSS Editor Frontend
 * 📄 File: apps/web/src/features/editor/editor-ai-dialog.spec.tsx
 *
 * 🎯 Purpose:
 * Verifies explicit external processing consent and human-applied AI proposals.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { runEditorAiCommand } from "./editor-actions";
import { EditorAiDialog } from "./editor-ai-dialog";

vi.mock("./editor-actions", () => ({
  runEditorAiCommand: vi.fn(),
}));

describe("EditorAiDialog", () => {
  it("requires consent, previews a labeled proposal and applies it separately", async () => {
    vi.mocked(runEditorAiCommand).mockResolvedValue({
      generationId: "generation-1",
      command: "Rewrite",
      generatedText: "Clearer selected text",
      generatedContentLabel: "Generated with DSS AI Core — review before use.",
      model: "configured-model",
      requiresConfirmation: true,
    });
    const apply = vi.fn();
    render(
      <EditorAiDialog
        profile="NEWS"
        sourceText="Selected text"
        onClose={vi.fn()}
        onApply={apply}
      />,
    );

    const generate = screen.getByRole("button", {
      name: "Generate proposal",
    });
    expect(generate).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Author instruction"), {
      target: { value: "Make it clearer" },
    });
    fireEvent.click(
      screen.getByLabelText(
        "Send this text and instruction to the configured external AI provider.",
      ),
    );
    fireEvent.click(generate);

    await waitFor(() =>
      expect(runEditorAiCommand).toHaveBeenCalledWith({
        command: "Rewrite",
        profile: "NEWS",
        sourceText: "Selected text",
        instruction: "Make it clearer",
        language: undefined,
        externalProcessingConfirmed: true,
      }),
    );
    expect(screen.getByText("Clearer selected text")).toBeInTheDocument();
    expect(screen.getByText(/review before use/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /apply to editor/i }));
    expect(apply).toHaveBeenCalledWith({
      command: "Rewrite",
      generatedText: "Clearer selected text",
      language: null,
    });
  });
});

/** No consent, no launch; no Apply, no document mutation. */
