"use client";

/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Forum
 * 📄 File: apps/web/src/features/forum/forum-post-editor.tsx
 *
 * 🎯 Purpose:
 * Inline editing of a post: DSS Editor seeded with the current document,
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
import { Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { DssEditor } from "@/features/editor/dss-editor";

import { editForumPost } from "./forum-actions";

export function ForumPostEditor({
  post,
  topicTitle,
  path,
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
  /** The read-only rendering shown while not editing. */
  children: ReactNode;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [document, setDocument] = useState<EditorDocument>(
    () => JSON.parse(post.documentJson) as EditorDocument,
  );
  const [title, setTitle] = useState(topicTitle);
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
      setEditing(false);
      router.refresh();
    });
  }

  if (!editing) {
    return (
      <div className="space-y-3">
        {children}
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-white/10 px-2.5 text-xs text-slate-300 hover:border-violet-400/40 hover:text-white"
        >
          <Pencil className="size-3.5" aria-hidden="true" />
          Редагувати
        </button>
      </div>
    );
  }

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
        initialDocument={document}
        onDocumentChange={setDocument}
        ariaLabel={`Редагування допису #${post.number}`}
      />
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
