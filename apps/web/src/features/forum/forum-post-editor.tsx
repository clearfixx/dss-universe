"use client";

/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Forum
 * 📄 File: apps/web/src/features/forum/forum-post-editor.tsx
 *
 * 🎯 Purpose:
 * Inline editing of a post (opened from the footer "Ред." button): DSS Editor seeded with the current document,
 * the topic title for the first post, optimistic revision check.
 *
 * ⚠️ Important:
 * Owner rules: a reply is editable for 10 minutes, the first post until the
 * topic gets a curator, moderators always. The API enforces it; a conflict
 * means someone else saved first.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { EditorDocument } from "@dss/editor";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { DssEditor } from "@/features/editor/dss-editor";

import { addForumStaffNote, editForumPost } from "./forum-actions";
import { useForumPostEdit } from "./forum-post-edit-scope";
import { STAFF_TAGS, type ForumStaffTagRole } from "./forum-staff-tags-model";

const STAFF_NOTE_MAX = 2000;

export function ForumPostEditor({
  post,
  topicTitle,
  path,
  staffRoles = [],
  allowsGatedContent = false,
  children,
}: {
  post: Readonly<{
    id: string;
    number: number;
    revision: number;
    documentJson: string;
  }>;
  topicTitle: string;
  path: string;
  /** Staff tags the viewer may add under the post (owner 2026-11-27). */
  staffRoles?: readonly ForumStaffTagRole[];
  /** The section lets posts hide content (Command Deck switch). */
  allowsGatedContent?: boolean;
  /** The read-only rendering shown while not editing. */
  children: ReactNode;
}) {
  const router = useRouter();
  const { editing, setEditing } = useForumPostEdit();
  const [document, setDocument] = useState<EditorDocument>(
    () => JSON.parse(post.documentJson) as EditorDocument,
  );
  const [title, setTitle] = useState(topicTitle);
  const [tagRole, setTagRole] = useState<ForumStaffTagRole | null>(null);
  const [tagText, setTagText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function save() {
    setError(null);
    start(async () => {
      const result = await editForumPost(
        {
          postId: post.id,
          expectedRevision: post.revision,
          documentJson: JSON.stringify(document),
          title: post.number === 1 && title !== topicTitle ? title : null,
        },
        path,
      );
      if (!result.ok) {
        setError(
          result.error.code === "CONFLICT"
            ? "Допис змінили в іншому вікні. Оновіть сторінку."
            : result.error.message,
        );
        return;
      }
      const note = tagText.trim();
      if (tagRole && note) {
        const added = await addForumStaffNote(post.id, note, path, tagRole);
        if (!added.ok) {
          setError(
            `Допис збережено, але тег не додано: ${added.error.message}`,
          );
          return;
        }
      }
      setTagRole(null);
      setTagText("");
      setEditing(false);
      router.refresh();
    });
  }

  if (!editing) return <>{children}</>;

  return (
    <div className="space-y-3 rounded-xl border border-violet-500/30 bg-slate-950/60 p-3">
      {post.number === 1 ? (
        <label className="block space-y-1 text-sm">
          <span className="text-slate-300">Заголовок теми</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white outline-none focus:border-violet-400"
          />
        </label>
      ) : null}
      <DssEditor
        profile={post.number === 1 ? "FORUM_TOPIC" : "FORUM_REPLY"}
        permissions={allowsGatedContent ? ["CONTENT_GATE_CONFIGURE"] : []}
        initialDocument={document}
        onDocumentChange={setDocument}
        ariaLabel={`Редагування допису #${post.number}`}
      />
      {staffRoles.length ? (
        <div className="space-y-2">
          <div
            role="group"
            aria-label="Теги персоналу"
            className="flex flex-wrap items-center gap-1.5"
          >
            <span className="text-xs text-slate-400">Теги:</span>
            {staffRoles.map((role) => {
              const tag = STAFF_TAGS[role];
              const active = tagRole === role;
              return (
                <button
                  key={role}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setTagRole(active ? null : role)}
                  className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs ring-1 ${tag.ring} ${
                    active
                      ? "bg-white/10 text-white"
                      : "text-slate-300 hover:bg-white/[0.06]"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`flex size-4 items-center justify-center rounded-sm font-serif text-[11px] font-bold text-white ${tag.square}`}
                  >
                    {tag.letter}
                  </span>
                  {tag.tag}
                </button>
              );
            })}
          </div>
          {tagRole ? (
            <label className="block space-y-1 text-sm">
              <span className="text-slate-300">
                {STAFF_TAGS[tagRole].tag}: текст у рамці під дописом
              </span>
              <textarea
                value={tagText}
                maxLength={STAFF_NOTE_MAX}
                onChange={(event) => setTagText(event.target.value)}
                rows={3}
                className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white outline-none focus:border-violet-400"
              />
            </label>
          ) : null}
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        {error ? (
          <p role="alert" className="text-sm text-rose-300">
            {error}
          </p>
        ) : null}
        <Button
          type="button"
          variant="outline"
          className="ml-auto"
          onClick={() => setEditing(false)}
          disabled={pending}
        >
          Скасувати
        </Button>
        <Button type="button" onClick={save} disabled={pending}>
          {pending ? "Зберігаємо…" : "Зберегти зміни"}
        </Button>
      </div>
    </div>
  );
}
