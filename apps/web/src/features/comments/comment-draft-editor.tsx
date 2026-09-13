/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Comments Frontend
 * 📄 File: apps/web/src/features/comments/comment-draft-editor.tsx
 *
 * 🎯 Purpose:
 * Provides the first owning-module integration of DSS Editor draft recovery.
 *
 * 🧠 Responsibilities:
 * • asks before restoring an existing private comment draft;
 * • binds canonical COMMENT snapshots to Comments GraphQL commands;
 * • surfaces saved, conflict and retry state without owning persistence.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

"use client";

import {
  assertEditorDocument,
  createEmptyEditorDocument,
  EditorDraftConflictError,
  type EditorDocument,
} from "@dss/editor";
import { useState, useTransition } from "react";

import { DssEditor } from "../editor/dss-editor";
import { EditorDraftRecovery } from "../editor/editor-draft-recovery";
import { useEditorAutosave } from "../editor/use-editor-autosave";
import {
  discardCommentDraft,
  saveCommentDraft,
  type CommentDraftRecord,
} from "./comment-draft-actions";
import styles from "./comment-draft-editor.module.css";

export function CommentDraftEditor({
  interactionTargetId,
  parentId = null,
  initialDraft = null,
}: {
  interactionTargetId: string;
  parentId?: string | null;
  initialDraft?: CommentDraftRecord | null;
}) {
  const [recovery, setRecovery] = useState(initialDraft);
  const [activeDraft, setActiveDraft] = useState<CommentDraftRecord | null>(
    null,
  );
  const [discardPending, startDiscard] = useTransition();

  if (recovery) {
    return (
      <EditorDraftRecovery
        updatedAt={recovery.updatedAt}
        preview={recovery.plainText}
        pending={discardPending}
        onRestore={() => {
          setActiveDraft(recovery);
          setRecovery(null);
        }}
        onDiscard={() =>
          startDiscard(async () => {
            await discardCommentDraft(recovery.id);
            setRecovery(null);
          })
        }
      />
    );
  }

  return (
    <AutosavingCommentEditor
      key={activeDraft?.id ?? "new-comment-draft"}
      interactionTargetId={interactionTargetId}
      parentId={parentId}
      draft={activeDraft}
    />
  );
}

function AutosavingCommentEditor({
  interactionTargetId,
  parentId,
  draft,
}: {
  interactionTargetId: string;
  parentId: string | null;
  draft: CommentDraftRecord | null;
}) {
  const initialDocument = draft
    ? assertEditorDocument(JSON.parse(draft.documentJson) as unknown)
    : createEmptyEditorDocument("COMMENT");
  const { snapshot, onDocumentChange, retry } = useEditorAutosave({
    initialVersion: draft?.version ?? 0,
    save: async ({ document, baseVersion }) => {
      try {
        const saved = await saveCommentDraft({
          interactionTargetId,
          parentId,
          documentJson: JSON.stringify(document),
          baseVersion,
        });
        return { version: saved.version, savedAt: saved.updatedAt };
      } catch (error: unknown) {
        if (
          error instanceof Error &&
          /changed in another session/i.test(error.message)
        ) {
          throw new EditorDraftConflictError(error.message);
        }
        throw error;
      }
    },
  });

  return (
    <section className={styles.composer}>
      <DssEditor
        profile="COMMENT"
        initialDocument={initialDocument as EditorDocument}
        onDocumentChange={onDocumentChange}
      />
      <footer data-phase={snapshot.phase}>
        <span>{statusLabel(snapshot.phase, snapshot.savedAt)}</span>
        {snapshot.phase === "ERROR" || snapshot.phase === "CONFLICT" ? (
          <button type="button" onClick={() => void retry()}>
            Retry save
          </button>
        ) : null}
      </footer>
    </section>
  );
}

function statusLabel(phase: string, savedAt: string | null): string {
  if (phase === "DIRTY") return "Unsaved changes";
  if (phase === "SAVING") return "Saving draft…";
  if (phase === "SAVED") {
    return savedAt
      ? `Draft saved ${new Date(savedAt).toLocaleTimeString()}`
      : "Draft saved";
  }
  if (phase === "CONFLICT") return "Draft changed in another session";
  if (phase === "ERROR") return "Draft could not be saved";
  return "Draft autosave ready";
}

/** Comments owns this draft; DSS Editor merely keeps the pencil sharp. */
