import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { NewsroomList } from "./newsroom-list";

afterEach(cleanup);

describe("NewsroomList", () => {
  it("renders status, revision and an editorial link", () => {
    render(
      <NewsroomList
        page={{
          total: 1,
          page: 1,
          pageSize: 20,
          totalPages: 1,
          items: [
            {
              id: "article-1",
              status: "CHANGES_REQUESTED",
              postType: "STANDARD",
              currentVersion: 3,
              title: "DSS Core update",
              shortText: "A sufficiently descriptive newsroom summary.",
            } as never,
          ],
        }}
      />,
    );
    expect(screen.getByText("Потрібні зміни")).toBeInTheDocument();
    expect(screen.getByText("v3")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /DSS Core update/ }),
    ).toHaveAttribute("href", "/newsroom/article-1");
  });
});
