import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { NewsAudience } from "./news-audience";

const recordNewsView = vi.fn();

vi.mock("./news-actions", () => ({
  recordNewsView: (...args: unknown[]) => recordNewsView(...args),
  recordNewsShare: vi.fn(),
}));

describe("NewsAudience", () => {
  afterEach(cleanup);

  beforeEach(() => {
    window.localStorage.clear();
    recordNewsView.mockResolvedValue({ viewCount: 13 });
  });

  it("records the visit and renders the unique total", async () => {
    render(
      <NewsAudience
        interactionTargetId="123e4567-e89b-42d3-a456-426614174000"
        title="DSS signal"
        initialViewCount={12}
        initialSharing={{ total: 0, channels: [] }}
        sharingEnabled
      />,
    );

    expect(screen.getByText(/12 унікальних переглядів/)).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText(/13 унікальних переглядів/)).toBeInTheDocument(),
    );
    expect(recordNewsView).toHaveBeenCalledOnce();
  });

  it("hides share controls when the article disables sharing", () => {
    render(
      <NewsAudience
        interactionTargetId="123e4567-e89b-42d3-a456-426614174000"
        title="DSS signal"
        initialViewCount={0}
        initialSharing={{ total: 0, channels: [] }}
        sharingEnabled={false}
      />,
    );
    expect(screen.queryByText("Facebook")).not.toBeInTheDocument();
  });
});
