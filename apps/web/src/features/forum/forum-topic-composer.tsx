"use client";

/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Forum
 * 📄 File: apps/web/src/features/forum/forum-topic-composer.tsx
 *
 * 🎯 Purpose:
 * New topic form from the owner mockups: section, type (question or
 * discussion), title, DSS Editor, curated tags and an optional poll.
 *
 * ⚠️ Important:
 * Hidden blocks are offered only in sections that allow them; tags come
 * only from the section's curated list (max 5). The API enforces cooldown,
 * read-only mode and every validation; the form explains the result.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { createEmptyEditorDocument, type EditorDocument } from "@dss/editor";
import { HelpCircle, MessagesSquare, Plus, Send, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { DssEditor } from "@/features/editor/dss-editor";

import {
  attachForumTopicPoll,
  createForumTopic,
  getForumSectionTags,
  setForumTopicTags,
} from "./forum-actions";

export type ForumComposerSection = Readonly<{
  id: string;
  title: string;
  category: string;
  allowsGatedContent: boolean;
}>;

type Tag = { id: string; slug: string; label: string };
const MAX_TAGS = 5;
const MIN_TITLE = 5;
const MAX_TITLE = 160;

export function ForumTopicComposer({
  sections,
  initialForumId,
}: {
  sections: readonly ForumComposerSection[];
  initialForumId: string | null;
}) {
  const router = useRouter();
  const [forumId, setForumId] = useState(
    initialForumId && sections.some((s) => s.id === initialForumId)
      ? initialForumId
      : "",
  );
  const [kind, setKind] = useState<"QUESTION" | "DISCUSSION">("QUESTION");
  const [title, setTitle] = useState("");
  const [document, setDocument] = useState<EditorDocument>(() =>
    createEmptyEditorDocument("FORUM_TOPIC"),
  );
  const [available, setAvailable] = useState<Tag[]>([]);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [pollOn, setPollOn] = useState(false);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [anonymous, setAnonymous] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const section = sections.find((s) => s.id === forumId) ?? null;

  function chooseSection(next: string) {
    setForumId(next);
    setTagIds([]);
    setAvailable([]);
    if (!next) return;
    void getForumSectionTags(next).then((result) =>
      setAvailable(result.ok ? result.data : []),
    );
  }

  // Load tags for a section preselected from the URL.
  useEffect(() => {
    if (!initialForumId) return;
    let live = true;
    void getForumSectionTags(initialForumId).then((result) => {
      if (live && result.ok) setAvailable(result.data);
    });
    return () => {
      live = false;
    };
  }, [initialForumId]);

  const pollOptions = options.map((o) => o.trim()).filter(Boolean);
  const pollInvalid = pollOn && (!question.trim() || pollOptions.length < 2);
  const invalid =
    !section || title.trim().length < MIN_TITLE || pollInvalid || pending;

  function submit() {
    setError(null);
    start(async () => {
      const created = await createForumTopic({
        forumId,
        kind,
        title: title.trim(),
        documentJson: JSON.stringify(document),
      });
      if (!created.ok) {
        setError(created.error.message);
        return;
      }
      const topicId = created.data.topic.id;
      const followUps: string[] = [];
      if (tagIds.length) {
        const tagged = await setForumTopicTags(topicId, tagIds);
        if (!tagged.ok) followUps.push(`теги: ${tagged.error.message}`);
      }
      if (pollOn) {
        const poll = await attachForumTopicPoll(topicId, {
          question: question.trim(),
          options: pollOptions,
          maxChoices: 1,
          visibility: anonymous ? "ANONYMOUS" : "OPEN",
        });
        if (!poll.ok) followUps.push(`опитування: ${poll.error.message}`);
      }
      if (followUps.length) {
        // The topic exists; tell the author what still needs attention.
        setError(
          `Тему створено, але не вдалося додати ${followUps.join("; ")}.`,
        );
      }
      router.push(`/community/forum/topics/${topicId}`);
    });
  }

  const field =
    "w-full rounded-lg border border-white/[0.09] bg-background px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-violet-400";
  const required = (
    <span className="text-rose-400" aria-hidden="true">
      {" "}
      *
    </span>
  );

  return (
    <form
      className="space-y-4 rounded-xl border border-white/[0.07] bg-card p-4 sm:p-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (!invalid) submit();
      }}
    >
      <div className="grid gap-4 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <label className="block space-y-1.5 text-sm">
          <span className="font-semibold text-white">
            Розділ (форум){required}
          </span>
          <select
            className={field}
            value={forumId}
            onChange={(event) => chooseSection(event.target.value)}
            required
            aria-label="Розділ (форум)"
          >
            <option value="">Оберіть розділ…</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.category} › {s.title}
              </option>
            ))}
          </select>
        </label>
        <fieldset className="text-sm">
          <legend className="mb-1.5 font-semibold text-white">
            Тип теми{required}
          </legend>
          <div className="grid grid-cols-2 rounded-lg border border-white/[0.09] bg-background p-0.5">
            {(
              [
                ["QUESTION", "Питання", HelpCircle],
                ["DISCUSSION", "Обговорення", MessagesSquare],
              ] as const
            ).map(([value, label, Icon]) => (
              <label
                key={value}
                className={`flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md text-sm font-medium transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-violet-400 ${
                  kind === value
                    ? "bg-violet-600 text-white"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                <input
                  type="radio"
                  name="kind"
                  value={value}
                  checked={kind === value}
                  onChange={() => setKind(value)}
                  className="sr-only"
                />
                <Icon className="size-4" aria-hidden="true" />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <label className="block space-y-1.5 text-sm">
        <span className="font-semibold text-white">
          Заголовок теми{required}
        </span>
        <input
          className={field}
          value={title}
          maxLength={MAX_TITLE}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Коротко й зрозуміло: про що тема"
          required
        />
        <span className="block text-right text-xs text-slate-500">
          {title.length} / {MAX_TITLE}
        </span>
      </label>

      <div className="space-y-1.5 text-sm">
        <span className="font-semibold text-white">
          Опис / зміст теми{required}
        </span>
        <DssEditor
          key={section?.allowsGatedContent ? "gated" : "plain"}
          profile="FORUM_TOPIC"
          permissions={
            section?.allowsGatedContent
              ? ["MEDIA_UPLOAD", "CONTENT_GATE_CONFIGURE"]
              : ["MEDIA_UPLOAD"]
          }
          initialDocument={document}
          onDocumentChange={setDocument}
          ariaLabel="Перший допис теми"
        />
        {section ? (
          <p className="text-xs text-slate-500">
            {section.allowsGatedContent
              ? "Прихований блок можна додати з панелі редактора."
              : "Приховані блоки в цьому розділі вимкнені."}
          </p>
        ) : null}
      </div>

      {available.length ? (
        <fieldset className="space-y-1.5 text-sm">
          <legend className="mb-1.5 font-semibold text-white">Теги</legend>
          <div className="flex flex-wrap gap-1.5 rounded-lg border border-white/[0.09] bg-background p-1.5">
            {available.map((tag) => {
              const on = tagIds.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  aria-pressed={on}
                  disabled={!on && tagIds.length >= MAX_TAGS}
                  onClick={() =>
                    setTagIds(
                      on
                        ? tagIds.filter((id) => id !== tag.id)
                        : [...tagIds, tag.id],
                    )
                  }
                  className={`rounded-md px-2.5 py-1 text-xs transition disabled:opacity-40 ${
                    on
                      ? "bg-violet-600 text-white"
                      : "bg-white/[0.05] text-slate-300 hover:bg-white/[0.1]"
                  }`}
                >
                  #{tag.label}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-slate-500">
            Оберіть теги з доступного переліку для цього розділу (до {MAX_TAGS}
            ).
          </p>
        </fieldset>
      ) : null}

      <section className="rounded-xl border border-white/[0.07] bg-white/[0.015] p-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={pollOn}
            aria-label="Додати опитування"
            onClick={() => setPollOn(!pollOn)}
            className={`relative h-5 w-9 shrink-0 rounded-full transition ${
              pollOn ? "bg-violet-600" : "bg-white/15"
            }`}
          >
            <span
              className={`absolute top-0.5 size-4 rounded-full bg-white transition-all ${
                pollOn ? "left-[1.125rem]" : "left-0.5"
              }`}
            />
          </button>
          <span className="text-sm font-semibold" aria-hidden="true">
            Додати опитування
          </span>
        </div>
        {pollOn ? (
          <div className="mt-3 grid gap-4 md:grid-cols-[minmax(0,1fr)_13rem]">
            <div className="space-y-2">
              <input
                className={field}
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="Питання опитування"
                aria-label="Питання опитування"
              />
              {options.map((option, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    className={field}
                    value={option}
                    onChange={(event) =>
                      setOptions(
                        options.map((o, i) =>
                          i === index ? event.target.value : o,
                        ),
                      )
                    }
                    placeholder={`Варіант ${index + 1}`}
                    aria-label={`Варіант ${index + 1}`}
                  />
                  {options.length > 2 ? (
                    <button
                      type="button"
                      onClick={() =>
                        setOptions(options.filter((_, i) => i !== index))
                      }
                      aria-label={`Прибрати варіант ${index + 1}`}
                      className="rounded-lg px-2 text-slate-400 hover:bg-white/[0.05] hover:text-rose-300"
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                  ) : null}
                </div>
              ))}
              {options.length < 10 ? (
                <button
                  type="button"
                  onClick={() => setOptions([...options, ""])}
                  className="inline-flex items-center gap-1 text-sm text-violet-300 hover:text-violet-200"
                >
                  <Plus className="size-4" aria-hidden="true" />
                  Додати варіант
                </button>
              ) : null}
            </div>
            <fieldset className="space-y-2 text-sm md:border-l md:border-white/[0.07] md:pl-4">
              <legend className="mb-2 font-medium text-slate-300">
                Тип опитування
              </legend>
              <label className="flex items-start gap-2">
                <input
                  type="radio"
                  name="poll-visibility"
                  checked={!anonymous}
                  onChange={() => setAnonymous(false)}
                  className="mt-1 accent-violet-500"
                />
                Відкрите (видно, хто голосував)
              </label>
              <label className="flex items-start gap-2">
                <input
                  type="radio"
                  name="poll-visibility"
                  checked={anonymous}
                  onChange={() => setAnonymous(true)}
                  className="mt-1 accent-violet-500"
                />
                Анонімне
              </label>
              <p className="pt-1 text-xs text-slate-500">
                Без дедлайну; голос не можна змінити.
              </p>
            </fieldset>
          </div>
        ) : null}
      </section>

      <div className="flex flex-wrap items-center gap-3 border-t border-white/[0.07] pt-4">
        {error ? (
          <p role="alert" className="text-sm text-rose-300">
            {error}
          </p>
        ) : (
          <p className="text-xs text-slate-500">Кулдаун між дописами: 60 с.</p>
        )}
        <div className="ml-auto flex flex-wrap gap-2">
          <Link
            href={section ? `/community/forum/${section.id}` : "/community"}
            className="inline-flex h-10 items-center rounded-lg border border-white/15 px-4 text-sm font-medium text-slate-200 hover:border-violet-400"
          >
            Скасувати
          </Link>
          <Button type="submit" className="h-10 px-4" disabled={invalid}>
            <Send className="size-4" aria-hidden="true" />
            {pending ? "Публікуємо…" : "Опублікувати тему"}
          </Button>
        </div>
      </div>
    </form>
  );
}
