import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Alert, AlertTitle, EmptyState, EmptyStateTitle, LoadingState, Skeleton } from "./feedback";

describe("Feedback primitives", () => {
  it("announces urgent alerts only when explicitly requested", () => {
    render(<><Alert><AlertTitle>Static notice</AlertTitle></Alert><Alert role="alert" variant="destructive">Request failed</Alert></>);
    expect(screen.getAllByRole("alert")).toHaveLength(1);
    expect(screen.getByRole("alert")).toHaveTextContent("Request failed");
  });

  it("exposes an accessible loading region and hides decorative skeletons", () => {
    const { container } = render(<LoadingState aria-label="Loading activity"><Skeleton className="h-8" /></LoadingState>);
    expect(screen.getByRole("status", { name: "Loading activity" })).toHaveAttribute("aria-busy", "true");
    expect(container.querySelector('[data-slot="skeleton"]')).toHaveAttribute("aria-hidden", "true");
  });

  it("keeps empty content readable without creating a live announcement", () => {
    render(<EmptyState><EmptyStateTitle>No activity</EmptyStateTitle></EmptyState>);
    expect(screen.getByText("No activity")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
