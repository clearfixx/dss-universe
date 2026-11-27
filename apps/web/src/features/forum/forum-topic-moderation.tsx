"use client";

/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Forum
 * 📄 File: apps/web/src/features/forum/forum-topic-moderation.tsx
 *
 * 🎯 Purpose:
 * "Moderator actions" sidebar panel of a topic (owner mockups): pin, close,
 * reopen, move, merge, split, archive, trash and clearing the accepted
 * answer. Close/reopen are also offered to authors and curators.
 *
 * ⚠️ Important:
 * Rendered only from `viewerAbilities`; the API re-checks every command.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import {
  Archive,
  ArchiveRestore,
  CheckCircle2,
  GitMerge,
  Lock,
  LockOpen,
  MoveRight,
  Pin,
  PinOff,
  Scissors,
  Trash2,
  Undo2,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import {
  ForumActionDialog,
  postNumbersFrom,
  topicIdFrom,
} from "./forum-action-dialog";
import {
  clearForumAcceptedAnswer,
  closeForumTopic,
  mergeForumTopics,
  moveForumTopic,
  reopenForumTopic,
  setForumTopicArchived,
  setForumTopicPinned,
  setForumTopicTrashed,
  splitForumTopic,
} from "./forum-actions";

type Abilities = Readonly<{
  moderate: boolean;
  close: boolean;
  reopen: boolean;
}>;

function Action({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-10 items-center gap-2 rounded-lg border px-3 text-left text-sm transition ${
        danger
          ? "border-rose-500/30 text-rose-200 hover:bg-rose-500/10"
          : "border-white/10 text-slate-200 hover:border-violet-400/40 hover:bg-white/5"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

export function ForumTopicModeration({
  topic,
  abilities,
  forums,
  path,
}: {
  topic: Readonly<{
    id: string;
    title: string;
    state: string;
    pinned: boolean;
    forumId: string;
    acceptedAnswerPostId?: string | null;
  }>;
  abilities: Abilities;
  forums: ReadonlyArray<{ id: string; title: string; category: string }>;
  path: string;
}) {
  if (!abilities.moderate && !abilities.close && !abilities.reopen) return null;
  const icon = "size-4 shrink-0";

  return (
    <section
      aria-labelledby="forum-moderation-title"
      className="rounded-2xl border border-violet-500/30 bg-card p-5"
    >
      <h2 id="forum-moderation-title" className="mb-3 font-semibold">
        {abilities.moderate ? "Дії модератора" : "Керування темою"}
      </h2>
      <div className="grid grid-cols-2 gap-2">
        {abilities.moderate ? (
          <ForumActionDialog
            title={topic.pinned ? "Відкріпити тему?" : "Закріпити тему?"}
            description="Закріплені теми показуються першими в розділі."
            confirmLabel={topic.pinned ? "Відкріпити" : "Закріпити"}
            run={() => setForumTopicPinned(topic.id, !topic.pinned, path)}
            trigger={(open) => (
              <Action
                icon={
                  topic.pinned ? (
                    <PinOff className={icon} aria-hidden="true" />
                  ) : (
                    <Pin className={icon} aria-hidden="true" />
                  )
                }
                label={topic.pinned ? "Відкріпити" : "Закріпити"}
                onClick={open}
              />
            )}
          />
        ) : null}

        {abilities.close ? (
          <ForumActionDialog
            title="Закрити тему?"
            description="Нові відповіді стануть недоступні; тема лишиться видимою."
            confirmLabel="Закрити"
            run={() => closeForumTopic(topic.id, path)}
            trigger={(open) => (
              <Action
                icon={<Lock className={icon} aria-hidden="true" />}
                label="Закрити"
                onClick={open}
              />
            )}
          />
        ) : null}
        {abilities.reopen ? (
          <ForumActionDialog
            title="Відкрити тему знову?"
            confirmLabel="Відкрити"
            run={() => reopenForumTopic(topic.id, path)}
            trigger={(open) => (
              <Action
                icon={<LockOpen className={icon} aria-hidden="true" />}
                label="Відкрити"
                onClick={open}
              />
            )}
          />
        ) : null}

        {abilities.moderate ? (
          <>
            <ForumActionDialog
              title="Перемістити тему"
              description={`«${topic.title}». Куратор переходить разом із темою.`}
              confirmLabel="Перемістити"
              fields={[
                {
                  name: "forumId",
                  label: "Новий розділ",
                  kind: "select",
                  required: true,
                  options: forums
                    .filter((forum) => forum.id !== topic.forumId)
                    .map((forum) => ({
                      value: forum.id,
                      label: `${forum.category} › ${forum.title}`,
                    })),
                },
              ]}
              run={(values) => moveForumTopic(topic.id, values.forumId, path)}
              trigger={(open) => (
                <Action
                  icon={<MoveRight className={icon} aria-hidden="true" />}
                  label="Перемістити"
                  onClick={open}
                />
              )}
            />
            <ForumActionDialog
              title="Об’єднати з іншою темою"
              description="Усі дописи перейдуть у цільову тему; ця тема стане переадресацією."
              confirmLabel="Об’єднати"
              fields={[
                {
                  name: "target",
                  label: "Цільова тема",
                  required: true,
                  placeholder: "Посилання на тему або її ID",
                },
              ]}
              run={(values) =>
                mergeForumTopics(topic.id, topicIdFrom(values.target), path)
              }
              redirectTo={(values) =>
                `/community/forum/topics/${topicIdFrom(values.target)}`
              }
              trigger={(open) => (
                <Action
                  icon={<GitMerge className={icon} aria-hidden="true" />}
                  label="Об’єднати"
                  onClick={open}
                />
              )}
            />
            <ForumActionDialog
              title="Розділити тему"
              description="Вибрані відповіді стануть новою темою в цьому ж розділі."
              confirmLabel="Розділити"
              fields={[
                {
                  name: "numbers",
                  label: "Номери дописів",
                  required: true,
                  placeholder: "Напр.: 5, 7-9",
                  hint: "Перший допис теми перенести не можна.",
                },
                {
                  name: "title",
                  label: "Заголовок нової теми",
                  required: true,
                },
              ]}
              run={(values) =>
                splitForumTopic(
                  topic.id,
                  postNumbersFrom(values.numbers),
                  values.title.trim(),
                  path,
                )
              }
              trigger={(open) => (
                <Action
                  icon={<Scissors className={icon} aria-hidden="true" />}
                  label="Розділити"
                  onClick={open}
                />
              )}
            />
            <ForumActionDialog
              title={
                topic.state === "ARCHIVED"
                  ? "Повернути з архіву?"
                  : "Перенести в архів?"
              }
              description="Архівна тема закрита для відповідей, але лишається видимою."
              confirmLabel={
                topic.state === "ARCHIVED" ? "Повернути" : "В архів"
              }
              run={() =>
                setForumTopicArchived(
                  topic.id,
                  topic.state !== "ARCHIVED",
                  path,
                )
              }
              trigger={(open) => (
                <Action
                  icon={
                    topic.state === "ARCHIVED" ? (
                      <ArchiveRestore className={icon} aria-hidden="true" />
                    ) : (
                      <Archive className={icon} aria-hidden="true" />
                    )
                  }
                  label={topic.state === "ARCHIVED" ? "З архіву" : "В архів"}
                  onClick={open}
                />
              )}
            />
            {topic.acceptedAnswerPostId ? (
              <ForumActionDialog
                title="Зняти прийняту відповідь?"
                description="Бали за відповідь не забираються."
                confirmLabel="Зняти"
                run={() => clearForumAcceptedAnswer(topic.id, path)}
                trigger={(open) => (
                  <Action
                    icon={<CheckCircle2 className={icon} aria-hidden="true" />}
                    label="Зняти відповідь"
                    onClick={open}
                  />
                )}
              />
            ) : null}
            {topic.state === "TRASHED" ? (
              <ForumActionDialog
                title="Відновити тему з кошика?"
                confirmLabel="Відновити"
                run={() => setForumTopicTrashed(topic.id, false, path)}
                trigger={(open) => (
                  <Action
                    icon={<Undo2 className={icon} aria-hidden="true" />}
                    label="Відновити"
                    onClick={open}
                  />
                )}
              />
            ) : (
              <ForumActionDialog
                title="Перемістити тему в кошик?"
                description="Учасники її не бачитимуть; модератори можуть відновити будь-коли."
                confirmLabel="У кошик"
                destructive
                run={() => setForumTopicTrashed(topic.id, true, path)}
                trigger={(open) => (
                  <Action
                    icon={<Trash2 className={icon} aria-hidden="true" />}
                    label="У кошик"
                    onClick={open}
                    danger
                  />
                )}
              />
            )}
          </>
        ) : null}
      </div>
      {abilities.moderate ? (
        <nav
          aria-label="Зона модерації"
          className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-white/[0.07] pt-3 text-sm"
        >
          <Link
            href="/community/moderation"
            className="text-violet-300 hover:underline"
          >
            Зона модерації
          </Link>
          <Link
            href="/community/moderation/trash"
            className="text-violet-300 hover:underline"
          >
            Кошик
          </Link>
          <Link
            href="/community/moderation/sanctions"
            className="text-violet-300 hover:underline"
          >
            Санкції
          </Link>
        </nav>
      ) : null}
    </section>
  );
}
