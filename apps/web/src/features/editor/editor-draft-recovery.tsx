/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: DSS Editor Frontend
 * 📄 File: apps/web/src/features/editor/editor-draft-recovery.tsx
 *
 * 🎯 Purpose:
 * Provides a reusable, DSS-owned restoration prompt for host-module drafts.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

"use client";

import { FileClock, RotateCcw, Trash2 } from "lucide-react";

import styles from "./editor-draft-recovery.module.css";

export function EditorDraftRecovery({
  updatedAt,
  preview,
  pending = false,
  onRestore,
  onDiscard,
}: {
  updatedAt: string;
  preview: string;
  pending?: boolean;
  onRestore: () => void;
  onDiscard: () => void;
}) {
  return (
    <section className={styles.recovery} aria-label="Unsaved draft found">
      <FileClock aria-hidden="true" />
      <div>
        <strong>Unsaved draft found</strong>
        <span>Last saved {new Date(updatedAt).toLocaleString()}</span>
        <p>{preview || "An empty draft was saved."}</p>
      </div>
      <div className={styles.actions}>
        <button type="button" disabled={pending} onClick={onRestore}>
          <RotateCcw aria-hidden="true" size={16} /> Restore
        </button>
        <button type="button" disabled={pending} onClick={onDiscard}>
          <Trash2 aria-hidden="true" size={16} /> Discard
        </button>
      </div>
    </section>
  );
}

/** Recovery asks before acting; good ideas deserve due process. */
