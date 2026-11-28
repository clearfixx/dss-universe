/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: DSS Editor Frontend
 * 📄 File: apps/web/src/features/editor/editor-resource-dialog.spec.tsx
 *
 * 🎯 Purpose:
 * Verifies Media Library and member suggestion selection flows for DSS Editor.
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
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  EditorMediaDialog,
  EditorMentionDialog,
} from "./editor-resource-dialog";
import {
  searchEditorMedia,
  searchMentionMembers,
  uploadEditorMedia,
} from "./editor-actions";

vi.mock("./editor-actions", () => ({
  searchEditorMedia: vi.fn(),
  searchMentionMembers: vi.fn(),
  uploadEditorMedia: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe("DSS Editor resource dialogs", () => {
  it("loads actor-scoped READY images and returns a Media Reference selection", async () => {
    vi.mocked(searchEditorMedia).mockResolvedValue({
      ok: true,
      items: [
        {
          id: "media-1",
          kind: "IMAGE",
          originalFilename: "nebula.png",
          mimeType: "image/png",
          width: 1280,
          height: 720,
        },
      ],
    });
    const select = vi.fn();
    render(
      <EditorMediaDialog mode="image" onClose={vi.fn()} onSelect={select} />,
    );

    expect(await screen.findByText("nebula.png")).toBeInTheDocument();
    expect(searchEditorMedia).toHaveBeenCalledWith({
      first: 24,
      kind: "IMAGE",
    });
    fireEvent.click(screen.getByText("nebula.png"));
    expect(select).toHaveBeenCalledWith({
      id: "media-1",
      kind: "IMAGE",
      label: "nebula.png",
    });
  });

  it("explains an ended session instead of showing a raw API error", async () => {
    vi.mocked(searchEditorMedia).mockResolvedValue({
      ok: false,
      error: "SIGNED_OUT",
    });
    render(
      <EditorMediaDialog mode="image" onClose={vi.fn()} onSelect={vi.fn()} />,
    );
    expect(await screen.findByText(/Сесія закінчилась/)).toBeInTheDocument();
  });

  it("sends a new image through the Media upload server action", async () => {
    vi.mocked(searchEditorMedia).mockResolvedValue({ ok: true, items: [] });
    vi.mocked(uploadEditorMedia).mockResolvedValue({
      sessionId: "session-1",
      filename: "new-nebula.png",
      status: "COMPLETED",
    });
    const { container } = render(
      <EditorMediaDialog mode="image" onClose={vi.fn()} onSelect={vi.fn()} />,
    );

    const file = new File(["png"], "new-nebula.png", { type: "image/png" });
    const input =
      container.querySelector<HTMLInputElement>('input[type="file"]');
    expect(input).not.toBeNull();
    fireEvent.change(input!, {
      target: { files: [file] },
    });

    await waitFor(() => expect(uploadEditorMedia).toHaveBeenCalledTimes(1));
    const [mode, formData] = vi.mocked(uploadEditorMedia).mock.calls[0]!;
    expect(mode).toBe("image");
    expect((formData.get("file") as File).name).toBe("new-nebula.png");
    expect(
      await screen.findByText(/entered Media processing/),
    ).toBeInTheDocument();
  });

  it("debounces member search and returns a structured mention selection", async () => {
    const member = {
      id: "user-1",
      username: "alex",
      displayName: "Alex Frost",
      avatarUrl: null,
      isOnline: true,
    };
    vi.mocked(searchMentionMembers).mockResolvedValue({
      ok: true,
      items: [member],
    });
    const select = vi.fn();
    render(<EditorMentionDialog onClose={vi.fn()} onSelect={select} />);

    fireEvent.change(
      screen.getByLabelText("Search by username or display name"),
      { target: { value: "al" } },
    );
    await waitFor(() => expect(screen.getByText("@alex")).toBeInTheDocument());
    fireEvent.click(screen.getByText("@alex"));
    expect(select).toHaveBeenCalledWith(member);
  });
});

/** Suggestions guide the cursor; canonical node IDs keep it on course. */
