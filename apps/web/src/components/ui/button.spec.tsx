/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web UI
 * 📄 File: apps/web/src/components/ui/button.spec.tsx
 *
 * 🎯 Purpose:
 * Verifies the baseline interaction and accessibility contract of Button.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { createRef } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Button } from "./button";

describe("Button", () => {
  it("renders an accessible button and forwards clicks", () => {
    const onClick = vi.fn();

    render(<Button onClick={onClick}>Enter Station</Button>);
    fireEvent.click(screen.getByRole("button", { name: "Enter Station" }));

    expect(onClick).toHaveBeenCalledOnce();
  });
  it("preserves caller classes, ref and native disabled behavior", () => {
    const ref = createRef<HTMLButtonElement>();
    const onClick = vi.fn();

    render(
      <Button ref={ref} disabled onClick={onClick} className="rounded-full">
        Disabled action
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Disabled action" });
    expect(ref.current).toBe(button);
    expect(button.classList.contains("rounded-full")).toBe(true);
    expect(button.classList.contains("rounded-lg")).toBe(false);
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("preserves the asChild link contract", () => {
    render(
      <Button asChild variant="link">
        <a href="/community">Community</a>
      </Button>,
    );

    const link = screen.getByRole("link", { name: "Community" });
    expect(link.getAttribute("href")).toBe("/community");
    expect(link.getAttribute("data-variant")).toBe("link");
  });
});
