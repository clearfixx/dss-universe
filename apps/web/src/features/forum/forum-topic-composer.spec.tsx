import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/features/editor/dss-editor", () => ({
  DssEditor: ({ permissions }: { permissions?: readonly string[] }) => (
    <div
      data-testid="editor"
      data-permissions={(permissions ?? []).join(",")}
    />
  ),
}));
vi.mock("./forum-actions", () => ({
  createForumTopic: vi.fn(),
  setForumTopicTags: vi.fn(),
  attachForumTopicPoll: vi.fn(),
  getForumSectionTags: vi.fn(() =>
    Promise.resolve({
      ok: true,
      data: Array.from({ length: 7 }, (_, i) => ({
        id: `t${i}`,
        slug: `tag${i}`,
        label: `tag${i}`,
      })),
    }),
  ),
}));

import { ForumTopicComposer } from "./forum-topic-composer";

const sections = [
  { id: "plain", title: "Backend", category: "Dev", allowsGatedContent: false },
  { id: "gated", title: "Premium", category: "Dev", allowsGatedContent: true },
];

describe("ForumTopicComposer", () => {
  it("needs a section and a title before publishing", () => {
    render(<ForumTopicComposer sections={sections} initialForumId={null} />);
    const publish = screen.getByRole("button", { name: /Опублікувати тему/ });
    expect(publish).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Розділ *"), {
      target: { value: "plain" },
    });
    fireEvent.change(screen.getByLabelText(/Заголовок теми/), {
      target: { value: "Як налаштувати кеш?" },
    });
    expect(publish).toBeEnabled();
  });

  it("offers hidden blocks only in sections that allow them", () => {
    const { rerender } = render(
      <ForumTopicComposer sections={sections} initialForumId="plain" />,
    );
    expect(screen.getByTestId("editor").dataset.permissions).toBe(
      "MEDIA_UPLOAD",
    );
    rerender(<ForumTopicComposer sections={sections} initialForumId="gated" />);
    fireEvent.change(screen.getByLabelText("Розділ *"), {
      target: { value: "gated" },
    });
    expect(screen.getByTestId("editor").dataset.permissions).toBe(
      "MEDIA_UPLOAD,CONTENT_GATE_CONFIGURE",
    );
  });

  it("limits curated tags to five", async () => {
    render(<ForumTopicComposer sections={sections} initialForumId="plain" />);
    const tags = await screen.findAllByRole("button", { name: /^#tag/ });
    tags.slice(0, 5).forEach((tag) => fireEvent.click(tag));
    expect(tags[5]).toBeDisabled();
    expect(tags[0]).toHaveAttribute("aria-pressed", "true");
  });

  it("requires a question and two options when a poll is added", () => {
    render(<ForumTopicComposer sections={sections} initialForumId="plain" />);
    fireEvent.change(screen.getByLabelText(/Заголовок теми/), {
      target: { value: "Опитування про стек" },
    });
    const publish = screen.getByRole("button", { name: /Опублікувати тему/ });
    expect(publish).toBeEnabled();
    fireEvent.click(screen.getByLabelText("Додати опитування"));
    expect(publish).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Питання опитування"), {
      target: { value: "Який стек?" },
    });
    fireEvent.change(screen.getByLabelText("Варіант 1"), {
      target: { value: "NestJS" },
    });
    fireEvent.change(screen.getByLabelText("Варіант 2"), {
      target: { value: "Next.js" },
    });
    expect(publish).toBeEnabled();
  });
});
