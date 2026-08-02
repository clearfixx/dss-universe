/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: DSS Editor Platform
 * 📄 File: packages/editor/src/autosave.spec.ts
 *
 * 🎯 Purpose:
 * Verifies debounce, version ordering, retry, and conflict behavior for DSS
 * Editor autosave coordination.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  EditorAutosaveCoordinator,
  EditorDraftConflictError,
  type EditorDraftSave,
} from "./autosave";
import { createEmptyEditorDocument } from "./document";

describe("EditorAutosaveCoordinator", () => {
  afterEach(() => vi.useRealTimers());

  it("debounces updates and advances the host-owned draft version", async () => {
    vi.useFakeTimers();
    const save = vi.fn<EditorDraftSave>().mockResolvedValue({
      version: 4,
      savedAt: "2026-08-02T10:00:00.000Z",
    });
    const coordinator = new EditorAutosaveCoordinator({
      save,
      initialVersion: 3,
      delayMs: 500,
    });
    const first = createEmptyEditorDocument("NEWS");
    const second = createEmptyEditorDocument("NEWS");
    second.content.content = [
      { type: "paragraph", content: [{ type: "text", text: "Latest" }] },
    ];

    coordinator.update(first);
    coordinator.update(second);
    await vi.advanceTimersByTimeAsync(500);

    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith({ document: second, baseVersion: 3 });
    expect(coordinator.getSnapshot()).toEqual({
      phase: "SAVED",
      version: 4,
      savedAt: "2026-08-02T10:00:00.000Z",
      error: null,
    });
  });

  it("serializes a newer update behind an active save", async () => {
    let finishFirst:
      | ((value: { version: number; savedAt: string }) => void)
      | null = null;
    const save = vi
      .fn<EditorDraftSave>()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finishFirst = resolve;
          }),
      )
      .mockResolvedValueOnce({ version: 2, savedAt: "second" });
    const coordinator = new EditorAutosaveCoordinator({ save, delayMs: 0 });
    const first = createEmptyEditorDocument("WIKI");
    const second = createEmptyEditorDocument("WIKI");

    coordinator.update(first);
    const firstFlush = coordinator.flush();
    coordinator.update(second);
    finishFirst?.({ version: 1, savedAt: "first" });
    await firstFlush;
    await coordinator.flush();

    expect(save).toHaveBeenNthCalledWith(1, {
      document: first,
      baseVersion: 0,
    });
    expect(save).toHaveBeenNthCalledWith(2, {
      document: second,
      baseVersion: 1,
    });
    expect(coordinator.getSnapshot().version).toBe(2);
  });

  it("retains failed content for explicit retry and distinguishes conflicts", async () => {
    const save = vi
      .fn<EditorDraftSave>()
      .mockRejectedValueOnce(new EditorDraftConflictError("Version conflict."))
      .mockResolvedValueOnce({ version: 8, savedAt: "recovered" });
    const coordinator = new EditorAutosaveCoordinator({
      save,
      initialVersion: 7,
      delayMs: 60_000,
    });
    coordinator.update(createEmptyEditorDocument("FORUM_TOPIC"));

    await coordinator.flush();
    expect(coordinator.getSnapshot()).toMatchObject({
      phase: "CONFLICT",
      version: 7,
      error: "Version conflict.",
    });

    await coordinator.retry();
    expect(save).toHaveBeenCalledTimes(2);
    expect(coordinator.getSnapshot()).toMatchObject({
      phase: "SAVED",
      version: 8,
      error: null,
    });
  });
});

/** A draft may be temporary; losing it should never be part of the workflow. */
