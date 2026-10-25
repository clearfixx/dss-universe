/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Guest demo lifecycle verification
 * 📄 File: apps/web/src/components/shell/use-demo-search-sequence.spec.tsx
 *
 * 🎯 Purpose:
 * Pins timer ownership, stale-callback rejection and exact progression timing.
 *
 * 🧠 Responsibilities:
 * • exercises the real hook with deterministic fake time;
 * • verifies replacement, cancellation and unmount cleanup;
 * • invokes captured obsolete callbacks without mocking successful state.
 *
 * 🏗️ Architecture:
 * Local lifecycle tests, independent of demo content and browser readiness.
 *
 * ⚠️ Important:
 * Captured duplicate callbacks pin reducer safety, not a browser exploit claim.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDemoSearchSequence } from "./use-demo-search-sequence";

describe("demo search sequence ownership", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(async () => {
    await act(async () => cleanup());
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("advances exactly once per550ms step and owns no timer after the answer", () => {
    const { result } = renderHook(useDemoSearchSequence);
    act(() => result.current.startSearch());
    expect(result.current.stage).toBe("searching");
    for (let step = 1; step <= 4; step++) {
      act(() => vi.advanceTimersByTime(549));
      expect(result.current.searchStep).toBe(step - 1);
      act(() => vi.advanceTimersByTime(1));
      expect(result.current.searchStep).toBe(step);
      expect(result.current.stage).toBe(step === 4 ? "answer" : "searching");
      expect(vi.getTimerCount()).toBe(step === 4 ? 0 : 1);
    }
  });

  it("restarts even an identical request and ignores an obsolete generation", () => {
    const timers = vi.spyOn(globalThis, "setTimeout");
    const { result } = renderHook(useDemoSearchSequence);
    act(() => result.current.startSearch());
    const obsolete = timers.mock.calls.findLast((call) => call[1] === 550)?.[0];
    if (typeof obsolete !== "function") throw Error("Missing search timer.");
    act(() => vi.advanceTimersByTime(300));
    act(() => result.current.startSearch());
    act(() => obsolete());
    expect(result.current.searchStep).toBe(0);
    act(() => vi.advanceTimersByTime(549));
    expect(result.current.searchStep).toBe(0);
    act(() => vi.advanceTimersByTime(1));
    expect(result.current.searchStep).toBe(1);
    expect(vi.getTimerCount()).toBe(1);
  });

  it("ignores an already consumed step and every callback after reset", () => {
    const timers = vi.spyOn(globalThis, "setTimeout");
    const { result } = renderHook(useDemoSearchSequence);
    act(() => result.current.startSearch());
    const obsolete = timers.mock.calls.findLast((call) => call[1] === 550)?.[0];
    if (typeof obsolete !== "function") throw Error("Missing search timer.");
    act(() => vi.advanceTimersByTime(550));
    act(() => obsolete());
    expect(result.current.searchStep).toBe(1);
    act(() => result.current.resetSearch());
    act(() => obsolete());
    act(() => vi.advanceTimersByTime(2200));
    expect(result.current.stage).toBe("idle");
    expect(result.current.searchStep).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("clears its pending timer on unmount without scheduling more work", () => {
    const { result, unmount } = renderHook(useDemoSearchSequence);
    act(() => result.current.startSearch());
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
    act(() => vi.advanceTimersByTime(2200));
    expect(vi.getTimerCount()).toBe(0);
  });
});
