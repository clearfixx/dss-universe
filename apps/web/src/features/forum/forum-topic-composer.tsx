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
    "w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-violet-400";

  return (
    <form
      className="space-y-5 rounded-2xl border border-white/10 bg-[#0f1328] p-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (!invalid) submit();
      }}
    >
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <label className="block space-y-1.5 text-sm">
          <span className="text-slate-300">Розділ *</span>
          <select
            className={field}
            value={forumId}
            onChange={(event) => chooseSection(event.target.value)}
            required
          >
            <option value="">Оберіть розділ…</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.category} › {s.title}
              </option>
            ))}
          </select>
        </label>
        <fieldset className="space-y-1.5 text-sm">
          <legend className="mb-1.5 text-slate-300">Тип теми *</legend>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                [
                  "QUESTION",
                  "Питання",
                  "Потрібна допомога, рішення",
                  HelpCircle,
                ],
                [
                  "DISCUSSION",
                  "Обговорення",
                  "Досвід, ідеї, думки",
                  MessagesSquare,
                ],
              ] as const
            ).map(([value, label, hint, Icon]) => (
              <label
                key={value}
                className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 ${
                  kind === value
                    ? "border-violet-400 bg-violet-500/15"
                    : "border-white/10 hover:border-violet-400/40"
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
                <Icon
                  className="mt-0.5 size-4 text-violet-300"
                  aria-hidden="true"
                />
                <span>
                  <span className="block font-medium text-white">{label}</span>
                  <span className="text-xs text-slate-400">{hint}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <label className="block space-y-1.5 text-sm">
        <span className="text-slate-300">Заголовок теми *</span>
        <input
          className={field}
          value={title}
          maxLength={160}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Коротко й зрозуміло: про що тема"
          required
        />
        <span className="block text-right text-xs text-slate-500">
          {title.length} / 160
        </span>
      </label>

      <div className="space-y-1.5 text-sm">
        <span className="text-slate-300">Повідомлення *</span>
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
        {section && !section.allowsGatedContent ? (
          <p className="text-xs text-slate-500">
            Приховані блоки в цьому розділі вимкнені.
          </p>
        ) : null}
      </div>

      {available.length ? (
        <fieldset className="space-y-2 text-sm">
          <legend className="text-slate-300">
            Теги розділу (до {MAX_TAGS})
          </legend>
          <div className="flex flex-wrap gap-2">
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
                  className={`rounded-md border px-2.5 py-1 text-xs disabled:opacity-40 ${
                    on
                      ? "border-violet-400 bg-violet-500/20 text-violet-100"
                      : "border-white/10 text-slate-300 hover:border-violet-400/40"
                  }`}
                >
                  #{tag.label}
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      <section className="space-y-3 rounded-xl border border-white/10 p-4">
        <label className="flex cursor-pointer items-center gap-3 text-sm font-medium">
          <input
            type="checkbox"
            checked={pollOn}
            onChange={(event) => setPollOn(event.target.checked)}
            className="accent-violet-500"
          />
          Додати опитування
        </label>
        {pollOn ? (
          <div className="space-y-3">
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
                    className="rounded-lg border border-white/10 px-2 text-slate-400 hover:text-rose-300"
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
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="poll-visibility"
                  checked={!anonymous}
                  onChange={() => setAnonymous(false)}
                  className="accent-violet-500"
                />
                Відкрите (видно, хто голосував)
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="poll-visibility"
                  checked={anonymous}
                  onChange={() => setAnonymous(true)}
                  className="accent-violet-500"
                />
                Анонімне
              </label>
            </div>
            <p className="text-xs text-slate-500">
              Без дедлайну; голос не можна змінити.
            </p>
          </div>
        ) : null}
      </section>

      <div className="flex flex-wrap items-center gap-3">
        {error ? (
          <p role="alert" className="text-sm text-rose-300">
            {error}
          </p>
        ) : (
          <p className="text-xs text-slate-500">
            Між дописами діє кулдаун 60 секунд.
          </p>
        )}
        <Button type="submit" className="ml-auto" disabled={invalid}>
          <Send className="size-4" aria-hidden="true" />
          {pending ? "Публікуємо…" : "Опублікувати тему"}
        </Button>
      </div>
    </form>
  );
}
