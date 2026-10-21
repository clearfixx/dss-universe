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

import { MockedProvider } from "@apollo/client/testing/react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  EditorMediaDocument,
  EditorMentionSuggestionsDocument,
} from "@/gql/graphql";

import {
  EditorMediaDialog,
  EditorMentionDialog,
} from "./editor-resource-dialog";
import { uploadEditorMedia } from "./editor-actions";

vi.mock("./editor-actions", () => ({
  uploadEditorMedia: vi.fn(),
}));

afterEach(() => cleanup());

describe("DSS Editor resource dialogs", () => {
  it("loads actor-scoped READY images and returns a Media Reference selection", async () => {
    const select = vi.fn();
    render(
      <MockedProvider
        mocks={[
          {
            request: {
              query: EditorMediaDocument,
              variables: { input: { first: 24, kind: "IMAGE" } },
            },
            result: {
              data: {
                editorMedia: {
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
                  pageInfo: { hasNextPage: false, endCursor: null },
                },
              },
            },
          },
        ]}
      >
        <EditorMediaDialog mode="image" onClose={vi.fn()} onSelect={select} />
      </MockedProvider>,
    );

    expect(await screen.findByText("nebula.png")).toBeInTheDocument();
    fireEvent.click(screen.getByText("nebula.png"));
    expect(select).toHaveBeenCalledWith({
      id: "media-1",
      kind: "IMAGE",
      label: "nebula.png",
    });
  });

  it("sends a new image through the Media upload server action", async () => {
    vi.mocked(uploadEditorMedia).mockResolvedValue({
      sessionId: "session-1",
      filename: "new-nebula.png",
      status: "COMPLETED",
    });
    const { container } = render(
      <MockedProvider
        mocks={[
          {
            request: {
              query: EditorMediaDocument,
              variables: { input: { first: 24, kind: "IMAGE" } },
            },
            result: {
              data: {
                editorMedia: {
                  items: [],
                  pageInfo: { hasNextPage: false, endCursor: null },
                },
              },
            },
          },
          {
            request: {
              query: EditorMediaDocument,
              variables: {
                input: {
                  first: 24,
                  kind: "IMAGE",
                  search: "new-nebula.png",
                },
              },
            },
            result: {
              data: {
                editorMedia: {
                  items: [],
                  pageInfo: { hasNextPage: false, endCursor: null },
                },
              },
            },
          },
        ]}
      >
        <EditorMediaDialog mode="image" onClose={vi.fn()} onSelect={vi.fn()} />
      </MockedProvider>,
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
    const select = vi.fn();
    render(
      <MockedProvider
        mocks={[
          {
            request: {
              query: EditorMentionSuggestionsDocument,
              variables: {
                input: {
                  page: 1,
                  limit: 8,
                  search: "al",
                  sort: "USERNAME_ASC",
                },
              },
            },
            result: {
              data: {
                members: {
                  items: [
                    {
                      id: "user-1",
                      username: "alex",
                      displayName: "Alex Frost",
                      avatarUrl: null,
                      isOnline: true,
                    },
                  ],
                  total: 1,
                },
              },
            },
          },
        ]}
      >
        <EditorMentionDialog onClose={vi.fn()} onSelect={select} />
      </MockedProvider>,
    );

    fireEvent.change(
      screen.getByLabelText("Search by username or display name"),
      {
        target: { value: "al" },
      },
    );
    await waitFor(() => expect(screen.getByText("@alex")).toBeInTheDocument());
    fireEvent.click(screen.getByText("@alex"));
    expect(select).toHaveBeenCalledWith({
      id: "user-1",
      username: "alex",
      displayName: "Alex Frost",
      avatarUrl: null,
      isOnline: true,
    });
  });
});

/** Suggestions guide the cursor; canonical node IDs keep it on course. */
