import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("./forum-actions", () => ({}));

import { postNumbersFrom, topicIdFrom } from "./forum-action-dialog";
import { ForumPostStaff } from "./forum-post-staff";
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

describe("ForumPostStaff", () => {
  it("shows nothing to ordinary members", () => {
    const { container } = render(
      <ForumPostStaff
        topicId="t"
        post={post("VISIBLE")}
        abilities={none}
        isAccepted={false}
        path="/t"
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("lets a topic author accept an answer but not moderate", () => {
    render(
      <ForumPostStaff
        topicId="t"
        post={post("VISIBLE")}
        abilities={{ ...none, acceptAnswer: true }}
        isAccepted={false}
        path="/t"
      />,
    );
    expect(screen.getByText("Прийняти відповідь")).toBeInTheDocument();
    expect(screen.queryByText("Приховати")).toBeNull();
  });

  it("offers restore instead of hide on removed posts and purge to admins", () => {
    render(
      <ForumPostStaff
        topicId="t"
        post={post("HIDDEN")}
        abilities={{ moderate: true, purge: true, acceptAnswer: true }}
        isAccepted={false}
        path="/t"
      />,
    );
    expect(screen.getByText("Відновити")).toBeInTheDocument();
    expect(screen.queryByText("Приховати")).toBeNull();
    expect(screen.queryByText("Прийняти відповідь")).toBeNull();
    expect(screen.getByText("Назавжди")).toBeInTheDocument();
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
