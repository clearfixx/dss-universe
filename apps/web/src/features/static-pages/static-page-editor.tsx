"use client";

/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Static Pages
 * 📄 File: apps/web/src/features/static-pages/static-page-editor.tsx
 *
 * 🎯 Purpose:
 * Command Deck editor of one static page: fields, document, preview of the
 * working copy, save, publish and unpublish.
 *
 * ⚠️ Important:
 * Publishing saves unsaved changes first, so the visitor gets exactly what
 * is on screen. The preview is the editor in read-only mode.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { createEmptyEditorDocument, type EditorDocument } from "@dss/editor";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { field } from "@/features/command-deck/community-hub-admin-kit";
import { DssEditor } from "@/features/editor/dss-editor";

import {
  createStaticPage,
  publishStaticPage,
  saveStaticPage,
  unpublishStaticPage,
  type SavedStaticPage,
} from "./static-page-actions";
import {
  PAGE_DESCRIPTION_MAX,
  PAGE_SLUG_MAX,
  PAGE_TITLE_MAX,
  pageFormError,
  pageStateLabel,
  suggestSlug,
} from "./static-page-model";

export type EditableStaticPage = Readonly<{
  id: string;
  slug: string;
  title: string;
  description: string;
  documentJson: string;
  revision: number;
  publishedAt?: unknown;
  hasUnpublishedChanges: boolean;
}>;

export function StaticPageEditor({
  page,
}: {
  page: EditableStaticPage | null;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(page?.title ?? "");
  const [slug, setSlug] = useState(page?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(page));
  const [description, setDescription] = useState(page?.description ?? "");
  const [document, setDocument] = useState<EditorDocument>(() =>
    page
      ? (JSON.parse(page.documentJson) as EditorDocument)
      : createEmptyEditorDocument("ADMIN"),
  );
  const [state, setState] = useState<SavedStaticPage | null>(
    page
      ? {
          id: page.id,
          revision: page.revision,
          published: Boolean(page.publishedAt),
          hasUnpublishedChanges: page.hasUnpublishedChanges,
        }
      : null,
  );
  const [dirty, setDirty] = useState(!page);
  const [preview, setPreview] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function edited() {
    setDirty(true);
    setMessage(null);
  }

  /** Saves the form when needed; null means it failed and said why. */
  async function persist(): Promise<SavedStaticPage | null> {
    if (state && !dirty) return state;
    const input = {
      title: title.trim(),
      slug,
      description: description.trim(),
      documentJson: JSON.stringify(document),
    };
    const refusal = pageFormError(input);
    if (refusal) {
      setError(refusal);
      return null;
    }
    const result = state
      ? await saveStaticPage(state.id, state.revision, input)
      : await createStaticPage(input);
    if (!result.ok) {
      setError(result.error.message);
      return null;
    }
    setState(result.data);
    setDirty(false);
    return result.data;
  }

  function run(work: () => Promise<void>) {
    setError(null);
    setMessage(null);
    start(work);
  }

  function done(next: SavedStaticPage, text: string) {
    setState(next);
    setMessage(text);
    if (!page) router.replace(`/command-deck/pages/${next.id}`);
    else router.refresh();
  }

  const save = () =>
    run(async () => {
      const saved = await persist();
      if (saved)
        done(
          saved,
          saved.published
            ? "Збережено. Відвідувачі побачать зміни після публікації."
            : "Чернетку збережено.",
        );
    });

  const publish = () =>
    run(async () => {
      const saved = await persist();
      if (!saved) return;
      const result = await publishStaticPage(saved.id, saved.revision);
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      done(result.data, "Опубліковано.");
    });

  const unpublish = () =>
    run(async () => {
      if (!state) return;
      const result = await unpublishStaticPage(state.id);
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      done(result.data, "Сторінку знято з публікації.");
    });

  const canPublish =
    !state || !state.published || state.hasUnpublishedChanges || dirty;

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">
          {page ? "Редагування сторінки" : "Нова сторінка"}
        </h1>
        <span className="rounded-md bg-white/[0.07] px-2 py-0.5 text-xs text-slate-300">
          {pageStateLabel({
            publishedAt: state?.published || null,
            hasUnpublishedChanges: state?.hasUnpublishedChanges ?? false,
          })}
          {state && dirty ? " · не збережено" : ""}
        </span>
        <Link
          href="/command-deck/pages"
          className="ml-auto text-sm text-violet-300 hover:underline"
        >
          Усі сторінки
        </Link>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1 text-sm">
          <span className="text-slate-300">Назва</span>
          <input
            value={title}
            maxLength={PAGE_TITLE_MAX}
            onChange={(event) => {
              setTitle(event.target.value);
              if (!slugTouched) setSlug(suggestSlug(event.target.value));
              edited();
            }}
            className={field}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-slate-300">
            Адреса: /pages/{slug || "назва"}
          </span>
          <input
            value={slug}
            maxLength={PAGE_SLUG_MAX}
            disabled={state?.published ?? false}
            onChange={(event) => {
              setSlug(event.target.value.toLowerCase());
              setSlugTouched(true);
              edited();
            }}
            className={`${field} disabled:opacity-60`}
          />
          {state?.published ? (
            <span className="block text-xs text-slate-500">
              Щоб змінити адресу, спершу зніміть сторінку з публікації.
            </span>
          ) : null}
        </label>
      </div>
      <label className="block space-y-1 text-sm">
        <span className="text-slate-300">
          Короткий опис (для пошуку та попереднього перегляду посилань)
        </span>
        <input
          value={description}
          maxLength={PAGE_DESCRIPTION_MAX}
          onChange={(event) => {
            setDescription(event.target.value);
            edited();
          }}
          className={field}
        />
      </label>

      <div role="group" aria-label="Режим" className="flex gap-1">
        {[false, true].map((value) => (
          <button
            key={String(value)}
            type="button"
            aria-pressed={preview === value}
            onClick={() => setPreview(value)}
            className={`rounded-lg border px-3 py-1.5 text-sm ${
              preview === value
                ? "border-violet-400 text-white"
                : "border-white/10 text-slate-400 hover:text-white"
            }`}
          >
            {value ? "Попередній перегляд" : "Редагування"}
          </button>
        ))}
      </div>

      {preview ? (
        <article className="rounded-xl border border-white/10 bg-card p-4">
          <h2 className="mb-3 text-3xl font-bold">{title || "Без назви"}</h2>
          <DssEditor
            key="preview"
            profile="ADMIN"
            editable={false}
            initialDocument={document}
            ariaLabel="Попередній перегляд сторінки"
          />
        </article>
      ) : (
        <DssEditor
          key="edit"
          profile="ADMIN"
          permissions={["MEDIA_UPLOAD"]}
          initialDocument={document}
          onDocumentChange={(next) => {
            setDocument(next);
            edited();
          }}
          ariaLabel="Вміст сторінки"
        />
      )}

      {error ? (
        <p role="alert" className="text-sm text-rose-300">
          {error}
        </p>
      ) : null}
      {message ? (
        <p role="status" className="text-sm text-emerald-300">
          {message}
        </p>
      ) : null}

      <div className="flex flex-wrap justify-end gap-2">
        {state?.published ? (
          <Button
            type="button"
            variant="outline"
            onClick={unpublish}
            disabled={pending}
          >
            Зняти з публікації
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          onClick={save}
          disabled={pending || !dirty}
        >
          {pending ? "Зачекайте…" : "Зберегти чернетку"}
        </Button>
        <Button
          type="button"
          onClick={publish}
          disabled={pending || !canPublish}
        >
          Опублікувати
        </Button>
      </div>
    </div>
  );
}
