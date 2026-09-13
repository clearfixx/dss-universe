/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: DSS Editor Frontend
 * 📄 File: apps/web/src/features/editor/use-editor-autosave.ts
 *
 * 🎯 Purpose:
 * Adapts the framework-neutral autosave coordinator to React host modules.
 *
 * 🧠 Responsibilities:
 * • exposes canonical document-change, retry and flush callbacks;
 * • binds one host save command for the mounted draft lifecycle;
 * • publishes versioned autosave state for custom DSS interfaces.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

"use client";

import {
  EditorAutosaveCoordinator,
  type EditorAutosaveSnapshot,
  type EditorDocument,
  type EditorDraftSave,
} from "@dss/editor";
import { useCallback, useEffect, useState } from "react";

export function useEditorAutosave({
  save,
  initialVersion = 0,
  delayMs,
}: {
  save: EditorDraftSave;
  initialVersion?: number;
  delayMs?: number;
}): {
  snapshot: EditorAutosaveSnapshot;
  onDocumentChange: (document: EditorDocument) => void;
  retry: () => Promise<void>;
  flush: () => Promise<void>;
} {
  const [coordinator] = useState(
    () =>
      new EditorAutosaveCoordinator({
        initialVersion,
        ...(delayMs === undefined ? {} : { delayMs }),
        save,
      }),
  );
  const [snapshot, setSnapshot] = useState(coordinator.getSnapshot());

  useEffect(() => {
    const unsubscribe = coordinator.subscribe(setSnapshot);
    return () => {
      unsubscribe();
      void coordinator.flush().finally(() => coordinator.dispose());
    };
  }, [coordinator]);

  return {
    snapshot,
    onDocumentChange: useCallback(
      (document: EditorDocument) => coordinator.update(document),
      [coordinator],
    ),
    retry: useCallback(() => coordinator.retry(), [coordinator]),
    flush: useCallback(() => coordinator.flush(), [coordinator]),
  };
}

/** React watches the gauges; the owning module still flies the persistence ship. */
