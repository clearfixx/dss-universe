"use client";

/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Forum
 * 📄 File: apps/web/src/features/forum/forum-post-staff.tsx
 *
 * 🎯 Purpose:
 * Per-post staff actions (owner mockups): accept answer, hide, delete,
 * restore, permanent removal, moderator note and author sanctions.
 *
 * ⚠️ Important:
 * Only rendered from `viewerAbilities`; the API re-checks every command.
 * Owner rules: a third active warning escalates to read-only automatically;
 * purge is for administrators and needs a reason.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import {
  CheckCircle2,
  EyeOff,
  ShieldAlert,
  StickyNote,
  Trash2,
  TriangleAlert,
  Undo2,
  XCircle,
} from "lucide-react";
import type { ReactNode } from "react";

import { ForumActionDialog } from "./forum-action-dialog";
import {
  acceptForumAnswer,
  addForumStaffNote,
  moderateForumPost,
  purgeForumPost,
  restrictForumPostAuthor,
  warnForumPostAuthor,
} from "./forum-actions";

function Chip({
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
      className={`inline-flex min-h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs transition ${
        danger
          ? "border-rose-500/30 text-rose-200 hover:bg-rose-500/10"
          : "border-white/10 text-slate-300 hover:border-violet-400/40 hover:text-white"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

const icon = "size-3.5";

export function ForumPostStaff({
  topicId,
  post,
  abilities,
  isAccepted,
  path,
}: {
  topicId: string;
  post: Readonly<{ id: string; number: number; state: string }>;
  abilities: Readonly<{
    moderate: boolean;
    purge: boolean;
    acceptAnswer: boolean;
  }>;
  isAccepted: boolean;
  path: string;
}) {
  const visible = post.state === "VISIBLE";
  const canAccept =
    abilities.acceptAnswer && visible && post.number > 1 && !isAccepted;
  if (!abilities.moderate && !canAccept && !abilities.purge) return null;
  const reason = [
    {
      name: "reason",
      label: "Причина",
      kind: "textarea" as const,
      required: true,
      placeholder: "Напр.: порушення правил, п. 2.1 — офтоп",
    },
  ];

  return (
    <div
      className="flex flex-wrap items-center gap-2 border-t border-white/5 pt-3"
      aria-label={`Дії модератора для допису #${post.number}`}
    >
      {abilities.moderate ? (
        <span className="text-xs font-medium text-violet-300">Модерація:</span>
      ) : null}

      {canAccept ? (
        <ForumActionDialog
          title={`Прийняти допис #${post.number} як відповідь?`}
          description="Автор відповіді отримає +10 балів (один раз на допис)."
          confirmLabel="Прийняти"
          run={() => acceptForumAnswer(topicId, post.id, path)}
          trigger={(open) => (
            <Chip
              icon={<CheckCircle2 className={icon} aria-hidden="true" />}
              label="Прийняти відповідь"
              onClick={open}
            />
          )}
        />
      ) : null}

      {abilities.moderate && visible ? (
        <>
          <ForumActionDialog
            title={`Приховати допис #${post.number}`}
            description="Учасники побачать лише позначку; модератори бачать вміст і можуть відновити."
            confirmLabel="Приховати"
            fields={reason}
            run={(values) =>
              moderateForumPost(post.id, "HIDE", values.reason, path)
            }
            trigger={(open) => (
              <Chip
                icon={<EyeOff className={icon} aria-hidden="true" />}
                label="Приховати"
                onClick={open}
              />
            )}
          />
          <ForumActionDialog
            title={`Видалити допис #${post.number}`}
            description="Допис зникне для учасників; модератор може відновити будь-коли."
            confirmLabel="Видалити"
            destructive
            fields={reason}
            run={(values) =>
              moderateForumPost(post.id, "DELETE", values.reason, path)
            }
            trigger={(open) => (
              <Chip
                icon={<Trash2 className={icon} aria-hidden="true" />}
                label="Видалити"
                onClick={open}
                danger
              />
            )}
          />
          <ForumActionDialog
            title="Мітка модератора"
            description="Публічна примітка під дописом (наприклад, «Тему перевірено»)."
            confirmLabel="Додати мітку"
            fields={[
              {
                name: "body",
                label: "Текст мітки",
                kind: "textarea",
                required: true,
              },
            ]}
            run={(values) =>
              addForumStaffNote(post.id, values.body.trim(), path)
            }
            trigger={(open) => (
              <Chip
                icon={<StickyNote className={icon} aria-hidden="true" />}
                label="Мітка"
                onClick={open}
              />
            )}
          />
        </>
      ) : null}

      {abilities.moderate && !visible && post.state !== "PURGED" ? (
        <ForumActionDialog
          title={`Відновити допис #${post.number}?`}
          confirmLabel="Відновити"
          run={() => moderateForumPost(post.id, "RESTORE", "", path)}
          trigger={(open) => (
            <Chip
              icon={<Undo2 className={icon} aria-hidden="true" />}
              label="Відновити"
              onClick={open}
            />
          )}
        />
      ) : null}

      {abilities.moderate && post.state !== "PURGED" ? (
        <>
          <ForumActionDialog
            title="Попередження автору"
            description="Діє 30 днів і записується в приватний журнал санкцій. Третє активне попередження автоматично вмикає «лише читання» на 7 днів."
            confirmLabel="Видати попередження"
            fields={reason}
            run={(values) => warnForumPostAuthor(post.id, values.reason)}
            trigger={(open) => (
              <Chip
                icon={<TriangleAlert className={icon} aria-hidden="true" />}
                label="Попередження"
                onClick={open}
              />
            )}
          />
          <ForumActionDialog
            title="Режим «лише читання» для автора"
            description="На весь сайт: читати й стежити за темами можна, писати — ні."
            confirmLabel="Обмежити"
            destructive
            fields={[
              {
                name: "days",
                label: "Тривалість",
                kind: "select",
                required: true,
                options: [
                  { value: "1", label: "1 день" },
                  { value: "3", label: "3 дні" },
                  { value: "7", label: "7 днів" },
                  { value: "14", label: "14 днів" },
                  { value: "30", label: "30 днів" },
                ],
              },
              ...reason,
            ]}
            run={(values) =>
              restrictForumPostAuthor(
                post.id,
                values.reason,
                new Date(Date.now() + Number(values.days) * 86_400_000),
              )
            }
            trigger={(open) => (
              <Chip
                icon={<ShieldAlert className={icon} aria-hidden="true" />}
                label="Лише читання"
                onClick={open}
                danger
              />
            )}
          />
        </>
      ) : null}

      {abilities.purge && post.state !== "PURGED" ? (
        <ForumActionDialog
          title={`Видалити допис #${post.number} назавжди?`}
          description="Текст і історія змін будуть стерті без можливості відновлення. Лише для секретів, шкідливого коду та юридичних запитів."
          confirmLabel="Видалити назавжди"
          destructive
          fields={reason}
          run={(values) => purgeForumPost(post.id, values.reason, path)}
          trigger={(open) => (
            <Chip
              icon={<XCircle className={icon} aria-hidden="true" />}
              label="Назавжди"
              onClick={open}
              danger
            />
          )}
        />
      ) : null}
    </div>
  );
}
