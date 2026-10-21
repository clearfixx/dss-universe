/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: DSS Editor Platform
 * 📄 File: packages/editor/src/autosave.ts
 *
 * 🎯 Purpose:
 * Defines the framework-neutral, version-aware autosave coordinator used by
 * DSS content modules without taking ownership of their draft persistence.
 *
 * 🧠 Responsibilities:
 * • debounces canonical editor documents;
 * • serializes saves so draft versions cannot race;
 * • exposes observable dirty, saving, saved, conflict, and error states;
 * • preserves unsaved content after failures for an explicit retry.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type { EditorDocument } from "./document";
import { assertEditorDocument } from "./validation";

export type EditorAutosavePhase =
  | "IDLE"
  | "DIRTY"
  | "SAVING"
  | "SAVED"
  | "CONFLICT"
  | "ERROR";

export type EditorAutosaveSnapshot = {
  phase: EditorAutosavePhase;
  version: number;
  savedAt: string | null;
  error: string | null;
};

export type EditorDraftSaveRequest = {
  document: EditorDocument;
  baseVersion: number;
};

export type EditorDraftSaveResult = {
  version: number;
  savedAt: string;
};

export type EditorDraftSave = (
  request: EditorDraftSaveRequest,
) => Promise<EditorDraftSaveResult>;

export type EditorAutosaveOptions = {
  save: EditorDraftSave;
  initialVersion?: number;
  delayMs?: number;
};

type SnapshotListener = (snapshot: EditorAutosaveSnapshot) => void;

const DEFAULT_AUTOSAVE_DELAY_MS = 1_500;

export class EditorDraftConflictError extends Error {
  constructor(message = "The draft changed in another session.") {
    super(message);
    this.name = "EditorDraftConflictError";
  }
}

export class EditorAutosaveCoordinator {
  private readonly saveDraft: EditorDraftSave;
  private readonly delayMs: number;
  private readonly listeners = new Set<SnapshotListener>();
  private pendingDocument: EditorDocument | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private activeSave: Promise<void> | null = null;
  private disposed = false;
  private snapshot: EditorAutosaveSnapshot;

  constructor(options: EditorAutosaveOptions) {
    if (!Number.isInteger(options.initialVersion ?? 0)) {
      throw new Error("Initial draft version must be an integer.");
    }
    if ((options.initialVersion ?? 0) < 0) {
      throw new Error("Initial draft version cannot be negative.");
    }
    if ((options.delayMs ?? DEFAULT_AUTOSAVE_DELAY_MS) < 0) {
      throw new Error("Autosave delay cannot be negative.");
    }
    this.saveDraft = options.save;
    this.delayMs = options.delayMs ?? DEFAULT_AUTOSAVE_DELAY_MS;
    this.snapshot = {
      phase: "IDLE",
      version: options.initialVersion ?? 0,
      savedAt: null,
      error: null,
    };
  }

  getSnapshot(): EditorAutosaveSnapshot {
    return this.snapshot;
  }

  subscribe(listener: SnapshotListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  update(document: EditorDocument): void {
    this.assertActive();
    this.pendingDocument = structuredClone(assertEditorDocument(document));
    this.publish({ phase: "DIRTY", error: null });
    this.schedule();
  }

  async flush(): Promise<void> {
    this.assertActive();
    this.clearTimer();
    if (this.activeSave) await this.activeSave;
    if (!this.pendingDocument) return;
    const save = this.runSave();
    this.activeSave = save;
    try {
      await save;
    } finally {
      if (this.activeSave === save) this.activeSave = null;
    }
  }

  async retry(): Promise<void> {
    if (!this.pendingDocument) return;
    await this.flush();
  }

  dispose(): void {
    this.disposed = true;
    this.clearTimer();
    this.listeners.clear();
  }

  private schedule(): void {
    this.clearTimer();
    if (this.activeSave) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.flush();
    }, this.delayMs);
  }

  private async runSave(): Promise<void> {
    const document = this.pendingDocument;
    if (!document) return;
    this.pendingDocument = null;
    const baseVersion = this.snapshot.version;
    this.publish({ phase: "SAVING", error: null });
    try {
      const result = await this.saveDraft({ document, baseVersion });
      if (!Number.isInteger(result.version) || result.version <= baseVersion) {
        throw new Error("Saved draft version must advance monotonically.");
      }
      this.publish({
        phase: this.pendingDocument ? "DIRTY" : "SAVED",
        version: result.version,
        savedAt: result.savedAt,
        error: null,
      });
      if (this.pendingDocument) this.schedule();
    } catch (error: unknown) {
      this.pendingDocument ??= document;
      this.publish({
        phase: error instanceof EditorDraftConflictError ? "CONFLICT" : "ERROR",
        error:
          error instanceof Error ? error.message : "Draft autosave failed.",
      });
    }
  }

  private publish(patch: Partial<EditorAutosaveSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...patch };
    for (const listener of this.listeners) listener(this.snapshot);
  }

  private clearTimer(): void {
    if (!this.timer) return;
    clearTimeout(this.timer);
    this.timer = null;
  }

  private assertActive(): void {
    if (this.disposed) {
      throw new Error("Editor autosave coordinator has been disposed.");
    }
  }
}

/** Autosave remembers the draft; domain modules still decide where it lives. */
