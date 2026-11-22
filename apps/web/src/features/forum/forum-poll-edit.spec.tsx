import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("./forum-actions", () => ({ castForumPollBallot: vi.fn() }));
vi.mock("@/features/editor/dss-editor", () => ({ DssEditor: () => null }));

import { ForumPoll } from "./forum-poll";
import { canEditForumPost } from "./forum-format";

const now = Date.parse("2026-11-21T12:00:00Z");
const minutesAgo = (m: number) => new Date(now - m * 60_000).toISOString();
const base = {
  viewerId: "me",
  moderator: false,
  topicState: "OPEN",
  curatorId: null,
  now,
};

describe("canEditForumPost", () => {
  it("allows own replies for 10 minutes only", () => {
    const reply = (m: number) => ({
      number: 3,
      authorId: "me",
      createdAt: minutesAgo(m),
    });
    expect(canEditForumPost({ ...base, post: reply(9) })).toBe(true);
    expect(canEditForumPost({ ...base, post: reply(11) })).toBe(false);
    expect(
      canEditForumPost({ ...base, post: { ...reply(1), authorId: "other" } }),
    ).toBe(false);
    expect(
      canEditForumPost({ ...base, topicState: "CLOSED", post: reply(1) }),
    ).toBe(false);
  });

  it("allows the first post until a curator exists, then the curator", () => {
    const first = { number: 1, authorId: "me", createdAt: minutesAgo(600) };
    expect(canEditForumPost({ ...base, post: first })).toBe(true);
    expect(canEditForumPost({ ...base, curatorId: "cur", post: first })).toBe(
      false,
    );
    expect(
      canEditForumPost({
        ...base,
        viewerId: "cur",
        curatorId: "cur",
        post: first,
      }),
    ).toBe(true);
  });

  it("always allows moderators and never guests", () => {
    const old = { number: 3, authorId: "x", createdAt: minutesAgo(999) };
    expect(canEditForumPost({ ...base, moderator: true, post: old })).toBe(
      true,
    );
    expect(canEditForumPost({ ...base, viewerId: null, post: old })).toBe(
      false,
    );
  });
});

const poll = {
  id: "poll",
  question: "Який стек?",
  visibility: "ANONYMOUS",
  maxChoices: 1,
  totalBallots: 4,
  viewerHasVoted: false,
  viewerChoiceIds: [],
  options: [
    { id: "a", label: "NestJS", position: 0, voteCount: 3 },
    { id: "b", label: "Next.js", position: 1, voteCount: 1 },
  ],
} as const;

describe("ForumPoll", () => {
  it("lets members choose before voting and hides results until then", () => {
    render(<ForumPoll poll={poll as never} signedIn path="/t" />);
    const button = screen.getByRole("button", { name: "Проголосувати" });
    expect(button).toBeDisabled();
    fireEvent.click(screen.getByLabelText("NestJS"));
    expect(button).toBeEnabled();
    expect(screen.queryByText("75% (3)")).toBeNull();
  });

  it("shows results to guests and after voting", () => {
    render(<ForumPoll poll={poll as never} signedIn={false} path="/t" />);
    expect(screen.getByText("75% (3)")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Проголосувати" })).toBeNull();
  });
});
