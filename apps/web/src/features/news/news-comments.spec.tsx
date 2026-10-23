/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: News Delivery Web Tests
 * 📄 File: apps/web/src/features/news/news-comments.spec.tsx
 * 🎯 Purpose: Preserves nullable tombstones and visible live replies.
 * 🧠 Responsibilities: verifies existing deletion labels and action visibility.
 * 🏗️ Architecture: Real component with generated query types; server actions isolated.
 * ⚠️ Important: Does not introduce replacement API text or new owner privileges.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  NewsCommentFieldsFragment,
  NewsCommentsQuery,
} from "@/gql/graphql";

import { NewsComments } from "./news-comments";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("./news-actions", () => ({
  createNewsComment: vi.fn(),
  loadMoreNewsComments: vi.fn(),
  setNewsVote: vi.fn(),
}));

afterEach(cleanup);

describe("NewsComments tombstone contract", () => {
  it("retains a nullable deleted parent and its live reply without tombstone actions", () => {
    const reply: NewsCommentFieldsFragment = {
      id: "reply",
      reactionTargetId: "reply-target",
      parentId: "deleted-parent",
      body: "Live reply remains visible",
      documentJson: null,
      isDeleted: false,
      editedAt: null,
      createdAt: "2026-10-23T12:00:00Z",
      author: {
        id: "author",
        username: "reader",
        displayName: null,
        avatarUrl: null,
      },
      engagement: { upvotes: 0, downvotes: 0, score: 0, viewerReaction: null },
    };
    const initial: NewsCommentsQuery["newsComments"] = {
      total: 1,
      page: 1,
      pageSize: 10,
      totalPages: 1,
      items: [
        {
          ...reply,
          id: "deleted-parent",
          parentId: null,
          body: null,
          documentJson: null,
          isDeleted: true,
          children: [{ ...reply, children: [] }],
        },
      ],
    };

    render(
      <NewsComments
        articleId="article"
        interactionTargetId="article-target"
        articlePath="/news/article"
        initial={initial}
        mode="DISABLED"
        threshold={0}
      />,
    );

    const tombstone = screen.getByText("Коментар видалено.");
    expect(tombstone).toBeInTheDocument();
    expect(screen.getByText("Live reply remains visible")).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: "Позитивна оцінка" }),
    ).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: "Відповісти" })).toHaveLength(
      1,
    );
    expect(
      within(tombstone.parentElement!).getAllByRole("article"),
    ).toHaveLength(1);
  });
});
