import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DesignUiKit } from "./design-ui-kit";

describe("DSS UI Kit", () => {
  it("renders the real scoped reference sections", () => {
    const { container } = render(<DesignUiKit />);
    expect(container.querySelector('[data-dss-design="v1"]')).toBeInTheDocument();
    for (const title of ["Foundations", "Controls", "Data display", "Overlays", "Navigation", "Feedback", "Patterns"]) {
      expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    }
    expect(screen.getByRole("table", { name: "Illustrative service states — not live telemetry." })).toBeInTheDocument();
  });

  it("updates local demo state and resets it", () => {
    render(<DesignUiKit />);
    fireEvent.click(screen.getByRole("button", { name: "Add demo item" }));
    expect(screen.getByText("Local button clicks: 1")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("switch", { name: "Digest" }));
    expect(screen.getByRole("switch", { name: "Digest" })).toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "Reset preview" }));
    expect(screen.getByText("Local button clicks: 0")).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Digest" })).not.toBeChecked();
  });

  it("opens an actual scoped dialog portal", async () => {
    render(<DesignUiKit />);
    fireEvent.click(screen.getByRole("button", { name: "Open dialog" }));
    const dialog = await screen.findByRole("dialog", { name: "Demo dialog" });
    expect(dialog).toHaveAttribute("data-dss-design", "v1");
    fireEvent.click(within(dialog).getByRole("button", { name: "Close preview" }));
  });
});
