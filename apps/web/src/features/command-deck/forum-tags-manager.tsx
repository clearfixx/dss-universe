"use client";

/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Command Deck
 * 📄 File: apps/web/src/features/command-deck/forum-tags-manager.tsx
 *
 * 🎯 Purpose:
 * «Теги» tab of Command Deck › Community Hub (P1 C03): pick a section,
 * see its allowed tags, rename them, switch them on or off and add new ones.
 *
 * ⚠️ Important:
 * Tags are their own records, so each change is saved at once (not part of
 * the settings batch). Colours and usage metrics from the mockup are not
 * approved and are left out.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Check, Plus, Tags } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

import { cn } from "@/lib/utils";

import { Card, Toggle, field } from "./community-hub-admin-kit";
import type { ForumDraft } from "./community-hub-admin-model";
import {
  createForumTag,
  listForumTags,
  updateForumTag,
  type AdminForumTag,
} from "./forum-tags-actions";
import { suggestTagSlug, tagDraftError } from "./forum-tags-model";

type SectionOption = Readonly<{ id: string; label: string }>;

export function ForumTagsManager({
  forums,
}: {
  forums: readonly ForumDraft[];
}) {
  const options: SectionOption[] = forums
    .filter(({ parentId }) => parentId === null)
    .flatMap((forum) => [
      { id: forum.id, label: forum.title },
      ...forums
        .filter(({ parentId }) => parentId === forum.id)
        .map((sub) => ({ id: sub.id, label: `${forum.title} › ${sub.title}` })),
    ]);
  const [forumId, setForumId] = useState(options[0]?.id ?? "");

  return (
    <Card
      title="Теги розділу"
      icon={<Tags className="size-5 text-violet-300" aria-hidden="true" />}
      action={
        <select
          aria-label="Розділ"
          className={cn(field, "h-9 w-64 max-w-full")}
          value={forumId}
          onChange={(event) => setForumId(event.target.value)}
        >
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      }
    >
      <p className="-mt-1 mb-3 text-xs text-slate-400">
        Учасники обирають теги лише з цього списку. Вимкнений тег зникає з
        вибору, але лишається на старих темах. Зміни зберігаються одразу.
      </p>
      {forumId ? (
        <TagList key={forumId} forumId={forumId} />
      ) : (
        <p className="text-sm text-slate-400">Спершу створіть розділ.</p>
      )}
    </Card>
  );
}

function TagList({ forumId }: { forumId: string }) {
  const [tags, setTags] = useState<AdminForumTag[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    start(async () => {
      const result = await listForumTags(forumId);
      if (result.ok) setTags(result.data);
      else setMessage(result.error.message);
    });
  }, [forumId]);

  function replace(next: AdminForumTag) {
    setTags((list) =>
      [...(list ?? []).filter(({ id }) => id !== next.id), next].sort((a, b) =>
        a.label.localeCompare(b.label, "uk"),
      ),
    );
  }

  if (tags === null) {
    return (
      <p role="status" className="text-sm text-slate-400">
        {message ?? (pending ? "Завантаження…" : "")}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {message ? (
        <p role="status" className="text-sm text-slate-200">
          {message}
        </p>
      ) : null}
      {tags.length === 0 ? (
        <p className="text-sm text-slate-400">
          У цьому розділі ще немає тегів.
        </p>
      ) : (
        <ul className="divide-y divide-white/[0.05] rounded-lg border border-white/[0.07]">
          {tags.map((tag) => (
            <TagRow
              key={tag.id}
              tag={tag}
              onSaved={(next, note) => {
                replace(next);
                setMessage(note);
              }}
              onError={setMessage}
            />
          ))}
        </ul>
      )}
      <NewTag
        forumId={forumId}
        onCreated={(tag) => {
          replace(tag);
          setMessage(`Тег «${tag.label}» додано.`);
        }}
        onError={setMessage}
      />
    </div>
  );
}

function TagRow({
  tag,
  onSaved,
  onError,
}: {
  tag: AdminForumTag;
  onSaved: (tag: AdminForumTag, note: string) => void;
  onError: (message: string) => void;
}) {
  const [label, setLabel] = useState(tag.label);
  const [slug, setSlug] = useState(tag.slug);
  const [pending, start] = useTransition();
  const changed = label.trim() !== tag.label || slug.trim() !== tag.slug;
  const problem = changed ? tagDraftError({ label, slug }) : null;

  function save(active = tag.active) {
    start(async () => {
      const result = await updateForumTag(tag.id, {
        label: label.trim(),
        slug: slug.trim(),
        active,
      });
      if (!result.ok || !result.data) {
        onError(result.ok ? "Тег не знайдено." : result.error.message);
        return;
      }
      onSaved(
        result.data,
        active !== tag.active
          ? `Тег «${result.data.label}» ${active ? "увімкнено" : "вимкнено"}.`
          : `Тег «${result.data.label}» збережено.`,
      );
    });
  }

  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-3 py-2.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto]">
      <input
        aria-label="Назва тегу"
        className={cn(field, "col-span-2 h-9 sm:col-span-1")}
        value={label}
        maxLength={40}
        onChange={(event) => setLabel(event.target.value)}
      />
      <input
        aria-label="Адреса тегу"
        className={cn(field, "col-span-2 h-9 font-mono text-xs sm:col-span-1")}
        value={slug}
        maxLength={40}
        onChange={(event) => setSlug(event.target.value.toLowerCase())}
      />
      <Toggle
        label={tag.active ? "Увімкнено" : "Вимкнено"}
        checked={tag.active}
        disabled={pending || changed}
        onChange={(next) => save(next)}
      />
      <button
        type="button"
        disabled={!changed || pending || problem !== null}
        title={problem ?? "Зберегти зміни тегу"}
        onClick={() => save()}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/15 px-3 text-sm text-white hover:border-violet-400 disabled:opacity-40"
      >
        <Check className="size-4" aria-hidden="true" />
        Зберегти
      </button>
      {problem ? (
        <p className="col-span-2 text-xs text-amber-200 sm:col-span-4">
          {problem}
        </p>
      ) : null}
    </li>
  );
}

function NewTag({
  forumId,
  onCreated,
  onError,
}: {
  forumId: string;
  onCreated: (tag: AdminForumTag) => void;
  onError: (message: string) => void;
}) {
  const [label, setLabel] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [pending, start] = useTransition();
  const effectiveSlug = slugTouched ? slug : suggestTagSlug(label);
  const problem =
    label || slug ? tagDraftError({ label, slug: effectiveSlug }) : null;

  function create() {
    start(async () => {
      const result = await createForumTag(forumId, {
        label: label.trim(),
        slug: effectiveSlug.trim(),
        active: true,
      });
      if (!result.ok || !result.data) {
        onError(result.ok ? "Тег не створено." : result.error.message);
        return;
      }
      onCreated(result.data);
      setLabel("");
      setSlug("");
      setSlugTouched(false);
    });
  }

  return (
    <form
      className="grid gap-2 rounded-lg border border-dashed border-white/15 p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-center"
      onSubmit={(event) => {
        event.preventDefault();
        create();
      }}
    >
      <input
        aria-label="Назва нового тегу"
        placeholder="Назва, напр. «Кешування»"
        className={cn(field, "h-9")}
        value={label}
        maxLength={40}
        onChange={(event) => setLabel(event.target.value)}
      />
      <input
        aria-label="Адреса нового тегу"
        placeholder="адреса, напр. keshuvannia"
        className={cn(field, "h-9 font-mono text-xs")}
        value={effectiveSlug}
        maxLength={40}
        onChange={(event) => {
          setSlugTouched(true);
          setSlug(event.target.value.toLowerCase());
        }}
      />
      <button
        type="submit"
        disabled={pending || !label.trim() || problem !== null}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
      >
        <Plus className="size-4" aria-hidden="true" />
        Додати тег
      </button>
      {problem ? (
        <p className="text-xs text-amber-200 sm:col-span-3">{problem}</p>
      ) : null}
    </form>
  );
}
