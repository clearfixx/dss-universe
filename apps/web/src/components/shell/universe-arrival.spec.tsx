/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Guest demo verification
 * 📄 File: apps/web/src/components/shell/universe-arrival.spec.tsx
 *
 * 🎯 Purpose:
 * Pins real React search progression across early interaction and effect replay.
 *
 * 🧠 Responsibilities:
 * • exercises the actual component, matching and rendered answer;
 * • controls browser-only observation/motion APIs and time deterministically;
 * • preserves cancellation and unmount cleanup without readiness delays.
 *
 * 🏗️ Architecture:
 * Component lifecycle regression; only the unrelated visual sphere is replaced.
 *
 * ⚠️ Important:
 * The controlled early-click schedule is not attribution of every CI failure.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { StrictMode } from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UniverseArrival } from "./universe-arrival";

vi.mock("./core-sphere", () => ({ CoreSphere: () => null }));

describe("demo search lifecycle", () => {
  let clickDuringFirstObservation: boolean;
  let earlyClickDispatched: boolean;

  beforeEach(() => {
    vi.useFakeTimers();
    clickDuringFirstObservation = false;
    earlyClickDispatched = false;
    localStorage.clear();
    vi.stubGlobal("matchMedia", () => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(private readonly callback: IntersectionObserverCallback) {}
        observe(target: Element) {
          if (
            target.matches("[data-arrival]") &&
            clickDuringFirstObservation &&
            !earlyClickDispatched
          ) {
            earlyClickDispatched = true;
            fireEvent.click(
              screen.getByRole("button", { name: /React architecture/ }),
            );
          }
          this.callback(
            [{ isIntersecting: true, target } as IntersectionObserverEntry],
            this as unknown as IntersectionObserver,
          );
        }
        unobserve() {}
        disconnect() {}
      },
    );
  });

  afterEach(async () => {
    await act(async () => cleanup());
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  async function completeSearch() {
    for (let step = 1; step <= 4; step++) {
      await act(async () => vi.advanceTimersByTime(550));
      if (step < 4)
        expect(
          screen.getByText(`${step} of 4 demo modules explored`),
        ).toBeInTheDocument();
    }
    expect(
      screen.getByText(/Organize the application by product feature/),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Exploring the Universe…"),
    ).not.toBeInTheDocument();
  }

  it("completes an early search through real StrictMode effect replay", async () => {
    clickDuringFirstObservation = true;
    await act(async () => {
      render(
        <StrictMode>
          <UniverseArrival />
        </StrictMode>,
      );
    });
    expect(earlyClickDispatched).toBe(true);
    expect(screen.getByText("Exploring the Universe…")).toBeInTheDocument();
    await completeSearch();
  });

  it("preserves normal progression, cancellation and a fresh restart", async () => {
    await act(async () => {
      render(<UniverseArrival />);
    });
    fireEvent.click(screen.getByRole("button", { name: /React architecture/ }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel search" }));
    await act(async () => vi.advanceTimersByTime(2200));
    expect(
      screen.queryByText(/Organize the application by product feature/),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /React architecture/ }));
    await completeSearch();
    fireEvent.click(
      screen.getByRole("button", { name: "Explore another question" }),
    );
    expect(screen.getByLabelText("Explore a demo question")).toHaveValue("");
    expect(screen.getByRole("button", { name: "Search demo" })).toBeDisabled();
  });
});
