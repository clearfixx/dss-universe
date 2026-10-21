/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Test Infrastructure Verification
 * 📄 File: apps/web/src/test-lifecycle.spec.tsx
 * 🎯 Purpose: Proves shared teardown unmounts a root without per-file cleanup hooks.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { render, screen } from "@testing-library/react";
import { useEffect } from "react";
import { afterAll, expect, it, vi } from "vitest";

const release = vi.fn();
function LifecycleProbe() {
  useEffect(() => () => release(), []);
  return <p>Mounted lifecycle probe</p>;
}

it("registers root teardown through the shared Vitest setup", () => {
  render(<LifecycleProbe />);
  expect(screen.getByText("Mounted lifecycle probe")).toBeInTheDocument();
  expect(release).not.toHaveBeenCalled();
});

afterAll(() => {
  expect(release).toHaveBeenCalledTimes(1);
  expect(screen.queryByText("Mounted lifecycle probe")).not.toBeInTheDocument();
});
