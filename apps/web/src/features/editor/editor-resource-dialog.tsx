/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: DSS Editor Frontend
 * 📄 File: apps/web/src/features/editor/editor-resource-dialog.tsx
 *
 * 🎯 Purpose:
 * Provides DSS-owned Media Library and member suggestion dialogs for editor
 * insertions without coupling Tiptap extensions to GraphQL.
 *
 * 🧠 Responsibilities:
 * • loads only the current actor's READY media through editorMedia;
 * • searches active, visible members for structured mention insertion;
 * • returns typed media or member selections to the editor surface;
 * • keeps loading, empty, error, and dismissal states accessible.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

"use client";

import { useLazyQuery } from "@apollo/client/react";
import {
  FileText,
  ImageIcon,
  RefreshCw,
  Search,
  Upload,
  UserRound,
  Video,
} from "lucide-react";
import { useEffect, useState } from "react";

import {
  EditorMediaDocument,
  EditorMentionSuggestionsDocument,
  type MediaKind,
} from "@/gql/graphql";

import styles from "./editor-resource-dialog.module.css";
import { uploadEditorMedia } from "./editor-actions";

export type EditorMediaSelection = {
  id: string;
  kind: MediaKind;
  label: string;
};

export type EditorMentionSelection = {
  id: string;
  username: string;
  displayName: string | null;
};

type MediaDialogProps = {
  mode: "image" | "video" | "attachment";
  onClose: () => void;
  onSelect: (selection: EditorMediaSelection) => void;
};

export function EditorMediaDialog({
  mode,
  onClose,
  onSelect,
}: MediaDialogProps) {
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [load, { data, loading, error }] = useLazyQuery(EditorMediaDocument, {
    fetchPolicy: "network-only",
  });
  const kind =
    mode === "image" ? "IMAGE" : mode === "video" ? "VIDEO" : undefined;

  const refresh = (): void => {
    void load({
      variables: {
        input: {
          first: 24,
          ...(kind ? { kind } : {}),
          ...(search.trim() ? { search: search.trim() } : {}),
        },
      },
    });
  };

  const upload = async (file: File): Promise<void> => {
    if (mode === "video") return;
    setUploading(true);
    setUploadError(null);
    setUploadNotice(null);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const result = await uploadEditorMedia(mode, formData);
      setSearch(result.filename);
      setUploadNotice(
        `${result.filename} entered Media processing. Refresh when it is READY.`,
      );
    } catch (reason) {
      setUploadError(
        reason instanceof Error ? reason.message : "Media upload failed.",
      );
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(
      () => {
        void load({
          variables: {
            input: {
              first: 24,
              ...(kind ? { kind } : {}),
              ...(search.trim() ? { search: search.trim() } : {}),
            },
          },
        });
      },
      search ? 250 : 0,
    );
    return () => window.clearTimeout(timer);
  }, [kind, load, search]);

  return (
    <DialogShell
      title={mode === "attachment" ? "Attach from DSS Media" : `Insert ${mode}`}
      onClose={onClose}
    >
      <SearchField value={search} onChange={setSearch} label="Search media" />
      <div className={styles.actions}>
        {mode !== "video" ? (
          <label className={styles.upload}>
            <Upload aria-hidden="true" size={16} />
            <span>{uploading ? "Uploading…" : "Upload new"}</span>
            <input
              type="file"
              disabled={uploading}
              accept={
                mode === "image"
                  ? "image/jpeg,image/png,image/webp"
                  : ".pdf,.zip,.txt,.md"
              }
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void upload(file);
                event.target.value = "";
              }}
            />
          </label>
        ) : (
          <span className={styles.hint}>
            Video upload policy is not enabled yet.
          </span>
        )}
        <button type="button" className={styles.refresh} onClick={refresh}>
          <RefreshCw aria-hidden="true" size={15} /> Refresh
        </button>
      </div>
      {uploadNotice ? <p className={styles.notice}>{uploadNotice}</p> : null}
      {uploadError ? <p className={styles.error}>{uploadError}</p> : null}
      <ResourceState loading={loading} error={error?.message} />
      {!loading && !error && data?.editorMedia.items.length === 0 ? (
        <p className={styles.empty}>No READY media matches this search.</p>
      ) : null}
      <div className={styles.grid}>
        {data?.editorMedia.items.map((item) => {
          const Icon =
            item.kind === "IMAGE"
              ? ImageIcon
              : item.kind === "VIDEO"
                ? Video
                : FileText;
          return (
            <button
              type="button"
              className={styles.resource}
              key={item.id}
              onClick={() =>
                onSelect({
                  id: item.id,
                  kind: item.kind,
                  label: item.originalFilename,
                })
              }
            >
              <Icon aria-hidden="true" size={20} />
              <span>{item.originalFilename}</span>
              <small>{item.mimeType}</small>
            </button>
          );
        })}
      </div>
    </DialogShell>
  );
}

export function EditorMentionDialog({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (selection: EditorMentionSelection) => void;
}) {
  const [search, setSearch] = useState("");
  const [load, { data, loading, error }] = useLazyQuery(
    EditorMentionSuggestionsDocument,
    { fetchPolicy: "network-only" },
  );

  useEffect(() => {
    const query = search.trim();
    if (query.length < 2) return;
    const timer = window.setTimeout(() => {
      void load({
        variables: {
          input: { page: 1, limit: 8, search: query, sort: "USERNAME_ASC" },
        },
      });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [load, search]);

  const items = search.trim().length >= 2 ? data?.members.items : undefined;
  return (
    <DialogShell title="Mention a member" onClose={onClose}>
      <SearchField
        value={search}
        onChange={setSearch}
        label="Search by username or display name"
        autoFocus
      />
      {search.trim().length < 2 ? (
        <p className={styles.empty}>Enter at least two characters.</p>
      ) : (
        <ResourceState loading={loading} error={error?.message} />
      )}
      {!loading && !error && items?.length === 0 ? (
        <p className={styles.empty}>No visible members found.</p>
      ) : null}
      <div className={styles.list}>
        {items?.map((member) => (
          <button
            type="button"
            className={styles.member}
            key={member.id}
            onClick={() => onSelect(member)}
          >
            <UserRound aria-hidden="true" size={18} />
            <span>
              <strong>@{member.username}</strong>
              <small>{member.displayName ?? "DSS member"}</small>
            </span>
            {member.isOnline ? <i title="Online" /> : null}
          </button>
        ))}
      </div>
    </DialogShell>
  );
}

function DialogShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.backdrop} role="presentation" onMouseDown={onClose}>
      <section
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <h2>{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close dialog">
            ×
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

function SearchField({
  value,
  onChange,
  label,
  autoFocus = false,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  autoFocus?: boolean;
}) {
  return (
    <label className={styles.search}>
      <Search aria-hidden="true" size={16} />
      <span className={styles.srOnly}>{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={label}
        autoFocus={autoFocus}
      />
    </label>
  );
}

function ResourceState({
  loading,
  error,
}: {
  loading: boolean;
  error?: string;
}) {
  if (loading) return <p className={styles.empty}>Scanning DSS resources…</p>;
  if (error) return <p className={styles.error}>{error}</p>;
  return null;
}

/** The picker selects references, never storage URLs. Coordinates beat cargo leaks. */
