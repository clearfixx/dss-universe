import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { NewsCard, type NewsCardItem } from "./news-card";

afterEach(cleanup);

describe("NewsCard", () => {
  it("presents an active pin separately from the Featured badge", () => {
    render(
      <NewsCard
        item={
          {
            id: "article-1",
            interactionTargetId: "target-1",
            postType: "STANDARD",
            language: "uk",
            slug: "pinned-signal",
            title: "Закріплений сигнал",
            shortText: "Короткий опис закріпленої новини DSS Universe.",
            coverMediaId: null,
            displayPublishedAt: "2026-09-22T10:00:00.000Z",
            featured: true,
            pin: { scope: "GLOBAL", categoryId: null, expiresAt: null },
            author: {
              id: "author-1",
              username: "alex",
              displayName: "Alex",
              avatarUrl: null,
            },
            primaryCategory: null,
            tags: [],
            engagement: {
              viewCount: 4,
              commentCount: 2,
              upvotes: 3,
              downvotes: 1,
              score: 2,
              bookmarkedByViewer: false,
              viewerReaction: null,
            },
          } as NewsCardItem
        }
      />,
    );
    expect(screen.getByText("Закріплено")).toBeInTheDocument();
    expect(screen.queryByText("Featured")).not.toBeInTheDocument();
  });
});
