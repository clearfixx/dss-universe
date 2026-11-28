import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ForumSectionList } from "./forum-section-list";

afterEach(cleanup);

const section = (id: string, showCounts = true) => ({
  id,
  slug: id,
  title: `Section ${id}`,
  showCounts,
  moderators: [],
  activity: { topicCount: 2, replyCount: 5, lastActivity: null },
});

describe("ForumSectionList", () => {
  it("links the subforums and folds those after the sixth", () => {
    render(
      <ForumSectionList
        sections={[
          {
            ...section("root"),
            moderators: [{ id: "m", username: "olena" }],
            subforums: Array.from({ length: 8 }, (_, i) => section(`s${i}`)),
          },
        ]}
      />,
    );
    expect(screen.getByText("ще 2")).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: "Section s0" })[0],
    ).toHaveAttribute("href", "/community/forum/s0");
    expect(screen.getByRole("link", { name: "olena" })).toHaveAttribute(
      "href",
      "/profile/olena",
    );
  });

  it("prints a dash when the section hides its counters", () => {
    render(<ForumSectionList sections={[section("quiet", false)]} />);
    expect(screen.getByText("Тем:").parentElement).toHaveTextContent("—");
    expect(screen.queryByText(/2 теми/)).not.toBeInTheDocument();
  });
});
