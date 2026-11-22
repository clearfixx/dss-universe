import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("./forum-actions", () => ({}));

import { postNumbersFrom, topicIdFrom } from "./forum-action-dialog";
import { ForumPostActionBar } from "./forum-post-action-bar";
import { ForumPostEditScope } from "./forum-post-edit-scope";
import { ForumTopicModeration } from "./forum-topic-moderation";

const id = "11111111-1111-4111-8111-111111111111";

describe("moderation helpers", () => {
  it("reads topic IDs from links or bare IDs", () => {
    expect(
      topicIdFrom(`https://dss.test/community/forum/topics/${id}#post-3`),
    ).toBe(id);
    expect(topicIdFrom(` ${id} `)).toBe(id);
  });

  it("parses post numbers and ranges, never the first post", () => {
    expect(postNumbersFrom("1, 5, 7-9, x, 5")).toEqual([5, 7, 8, 9]);
    expect(postNumbersFrom("")).toEqual([]);
  });
});

const none = { moderate: false, purge: false, acceptAnswer: false };
const post = (state: string, number = 3) => ({ id: "p", number, state });

function bar(state: string, abilities: typeof none, canEdit = false) {
  return render(
    <ForumPostEditScope canEdit={canEdit}>
      <ForumPostActionBar
        topicId="t"
        post={post(state)}
        abilities={abilities}
        isAccepted={false}
        path="/t"
        canReply
      />
    </ForumPostEditScope>,
  );
}

describe("ForumPostActionBar", () => {
  it("shows ordinary actions but no staff tools to members", () => {
    bar("VISIBLE", none);
    expect(screen.getByText("Відповісти")).toBeInTheDocument();
    expect(screen.getByText("Цитата")).toBeInTheDocument();
    expect(screen.queryByText("Модерація:")).toBeNull();
    expect(screen.queryByLabelText("Інші дії з дописом #3")).toBeNull();
  });

  it("lets a topic author reach accept via the menu without staff tools", () => {
    bar("VISIBLE", { ...none, acceptAnswer: true });
    expect(screen.getByLabelText("Інші дії з дописом #3")).toBeInTheDocument();
    expect(screen.queryByText("Вид.")).toBeNull();
  });

  it("gives an author an edit button while the edit window is open", () => {
    bar("VISIBLE", none, true);
    expect(screen.getByText("Редагувати")).toBeInTheDocument();
  });

  it("shows the staff group, with restore instead of hide on removed posts", () => {
    bar("VISIBLE", { moderate: true, purge: true, acceptAnswer: true }, true);
    expect(screen.getByText("Модерація:")).toBeInTheDocument();
    expect(screen.getByText("Вид.")).toBeInTheDocument();
    expect(screen.getByText("Ред.").closest("button")).toBeEnabled();
    expect(screen.getByText("IP+UA").closest("button")).toBeDisabled();
  });

  it("offers restore on hidden posts and disables reply", () => {
    bar("HIDDEN", { moderate: true, purge: true, acceptAnswer: true });
    expect(screen.getByTitle("Відновити допис")).toBeInTheDocument();
    expect(screen.queryByTitle("Приховати допис")).toBeNull();
    expect(screen.getByText("Відповісти").closest("button")).toBeDisabled();
  });
});

describe("ForumTopicModeration", () => {
  const topic = {
    id: "t",
    title: "Topic",
    state: "OPEN",
    pinned: false,
    forumId: "f",
    acceptedAnswerPostId: null,
  };

  it("gives authors only close and moderators the full panel", () => {
    const { rerender } = render(
      <ForumTopicModeration
        topic={topic}
        abilities={{ moderate: false, close: true, reopen: false }}
        forums={[]}
        path="/t"
      />,
    );
    expect(screen.getByText("Керування темою")).toBeInTheDocument();
    expect(screen.getByText("Закрити")).toBeInTheDocument();
    expect(screen.queryByText("Перемістити")).toBeNull();

    rerender(
      <ForumTopicModeration
        topic={topic}
        abilities={{ moderate: true, close: true, reopen: false }}
        forums={[]}
        path="/t"
      />,
    );
    for (const label of [
      "Закріпити",
      "Перемістити",
      "Об’єднати",
      "Розділити",
      "В архів",
      "У кошик",
    ])
      expect(screen.getByText(label)).toBeInTheDocument();
  });
});
