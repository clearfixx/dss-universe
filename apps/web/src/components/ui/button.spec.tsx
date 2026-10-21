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
});
