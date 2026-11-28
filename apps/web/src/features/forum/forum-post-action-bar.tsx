"use client";

/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Forum
 * 📄 File: apps/web/src/features/forum/forum-post-action-bar.tsx
 *
 * 🎯 Purpose:
 * The post footer from the owner's action-bar mockup: ordinary actions on
 * the left (Відповісти, Цитата, закладка, поділитися, ⋯) and, for staff, a
 * separate "Модерація:" group (Вид., Ред., IP+UA) on the right.
 *
 * ⚠️ Important:
 * Owner decision 2026-11-21: the rarer per-post staff actions (accept,
 * staff note, delete, warning, read-only, purge) live in the "⋯" menu.
 * Bookmarks wait for their API and render disabled with a "Скоро" tooltip.
 * IP+UA opens only for holders of forum.network.view (P1 B11); each open is
 * an audited read. The API stays authoritative for every action shown here.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import {
  Ban,
  Bookmark,
  CheckCircle2,
  Eye,
  EyeOff,
  Fingerprint,
  MoreHorizontal,
  Pencil,
  Quote,
  Reply,
  Share2,
  ShieldAlert,
  StickyNote,
  Trash2,
  TriangleAlert,
  XCircle,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

import { ForumActionDialog } from "./forum-action-dialog";
import {
  acceptForumAnswer,
  addForumStaffNote,
  moderateForumPost,
  purgeForumPost,
  restrictForumPostAuthor,
  warnForumPostAuthor,
} from "./forum-actions";
import { banForumAuthor } from "@/features/command-deck/ban-admin-actions";
import { useForumPostEdit } from "./forum-post-edit-scope";
import { ForumPostNetworkDialog } from "./forum-post-network-dialog";
import { targetForumReply } from "./forum-topic-controls";

type DialogKey =
  | "accept"
  | "hide"
  | "restore"
  | "delete"
  | "note"
  | "warn"
  | "restrict"
  | "purge"
  | "ban"
  | "network";

const plain =
  "inline-flex min-h-8 items-center gap-1.5 rounded-md px-2 text-[13px] text-slate-300 transition hover:bg-white/[0.06] hover:text-white disabled:pointer-events-none disabled:opacity-40";
const iconOnly =
  "inline-flex size-8 items-center justify-center rounded-md text-slate-300 transition hover:bg-white/[0.06] hover:text-white disabled:cursor-default disabled:opacity-40";
const staff =
  "inline-flex min-h-7 items-center gap-1.5 rounded px-2 text-xs text-slate-300 transition hover:bg-white/[0.06] hover:text-white disabled:cursor-default disabled:opacity-40";

const reasonField = [
  {
    name: "reason",
    label: "Причина",
    kind: "textarea" as const,
    required: true,
    placeholder: "Напр.: порушення правил, п. 2.1 — офтоп",
  },
];

export function ForumPostActionBar({
  topicId,
  post,
  abilities,
  isAccepted,
  path,
  canReply,
  ban = null,
}: {
  topicId: string;
  post: Readonly<{ id: string; number: number; state: string }>;
  abilities: Readonly<{
    moderate: boolean;
    purge: boolean;
    acceptAnswer: boolean;
    network?: boolean;
    networkDelete?: boolean;
  }>;
  isAccepted: boolean;
  path: string;
  canReply: boolean;
  /** Set when the viewer may ban this author permanently. */
  ban?: Readonly<{
    authorId: string;
    authorName: string;
    rules: ReadonlyArray<{ id: string; code: string; text: string }>;
  }> | null;
}) {
  const { canEdit, editing, setEditing } = useForumPostEdit();
  const [dialog, setDialog] = useState<DialogKey | null>(null);
  const [copied, setCopied] = useState(false);
  const visible = post.state === "VISIBLE";
  const purged = post.state === "PURGED";
  const canAccept =
    abilities.acceptAnswer && visible && post.number > 1 && !isAccepted;
  const staffMenu = abilities.moderate && !purged;
  const hasMenu =
    canAccept || staffMenu || (abilities.purge && !purged) || ban !== null;

  const dialogProps = (key: DialogKey) => ({
    open: dialog === key,
    onOpenChange: (open: boolean) => setDialog(open ? key : null),
  });
  const menuItem = (
    key: DialogKey,
    icon: ReactNode,
    label: string,
    danger = false,
  ) => (
    <DropdownMenuItem
      onSelect={() => setDialog(key)}
      className={danger ? "text-rose-300 focus:text-rose-200" : undefined}
    >
      {icon}
      {label}
    </DropdownMenuItem>
  );

  return (
    <div
      role="toolbar"
      aria-label={`Дії з дописом #${post.number}`}
      className="flex flex-wrap items-center gap-0.5 rounded-lg bg-white/[0.03] p-1"
    >
      <div
        className={cn(
          "flex flex-wrap items-center gap-0.5",
          !visible && "opacity-50",
        )}
      >
        <button
          type="button"
          className={plain}
          disabled={!canReply || !visible}
          onClick={() =>
            targetForumReply({ number: post.number, quote: false })
          }
        >
          <Reply className="size-4" aria-hidden="true" />
          Відповісти
        </button>
        <button
          type="button"
          className={plain}
          disabled={!canReply || !visible}
          onClick={() => targetForumReply({ number: post.number, quote: true })}
        >
          <Quote className="size-4" aria-hidden="true" />
          Цитата
        </button>
        <button
          type="button"
          className={iconOnly}
          disabled
          title="Закладки — скоро"
          aria-label="Додати в закладки (скоро)"
        >
          <Bookmark className="size-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          className={iconOnly}
          disabled={!visible}
          title={copied ? "Посилання скопійовано" : "Поділитися"}
          aria-label={`Скопіювати посилання на допис #${post.number}`}
          onClick={() => {
            const url = new URL(
              `${path.split("#")[0]}#post-${post.number}`,
              window.location.href,
            );
            void navigator.clipboard
              ?.writeText(url.toString())
              .then(() => setCopied(true));
          }}
        >
          <Share2 className="size-4" aria-hidden="true" />
        </button>
        {canEdit && !abilities.moderate ? (
          <button
            type="button"
            className={plain}
            aria-pressed={editing}
            onClick={() => setEditing(!editing)}
          >
            <Pencil className="size-4" aria-hidden="true" />
            Редагувати
          </button>
        ) : null}
      </div>

      {hasMenu ? (
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={iconOnly}
              aria-label={`Інші дії з дописом #${post.number}`}
            >
              <MoreHorizontal className="size-4" aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {canAccept
              ? menuItem(
                  "accept",
                  <CheckCircle2 aria-hidden="true" />,
                  "Прийняти відповідь",
                )
              : null}
            {staffMenu && visible ? (
              <>
                {menuItem(
                  "note",
                  <StickyNote aria-hidden="true" />,
                  "Мітка модератора",
                )}
                {menuItem(
                  "delete",
                  <Trash2 aria-hidden="true" />,
                  "Видалити",
                  true,
                )}
              </>
            ) : null}
            {staffMenu ? (
              <>
                <DropdownMenuSeparator />
                {menuItem(
                  "warn",
                  <TriangleAlert aria-hidden="true" />,
                  "Попередження автору",
                )}
                {menuItem(
                  "restrict",
                  <ShieldAlert aria-hidden="true" />,
                  "Лише читання",
                  true,
                )}
              </>
            ) : null}
            {ban ? (
              <>
                <DropdownMenuSeparator />
                {menuItem(
                  "ban",
                  <Ban aria-hidden="true" />,
                  "Забанити автора назавжди",
                  true,
                )}
              </>
            ) : null}
            {abilities.purge && !purged ? (
              <>
                <DropdownMenuSeparator />
                {menuItem(
                  "purge",
                  <XCircle aria-hidden="true" />,
                  "Видалити назавжди",
                  true,
                )}
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}

      {abilities.moderate ? (
        <div className="ml-auto flex items-center gap-2 pl-1">
          <span className="text-xs text-slate-400">Модерація:</span>
          <div
            role="group"
            aria-label={`Модерація допису #${post.number}`}
            className="flex items-center divide-x divide-white/10 rounded-md bg-white/[0.04]"
          >
            {!purged ? (
              <button
                type="button"
                className={staff}
                title={visible ? "Приховати допис" : "Відновити допис"}
                onClick={() => setDialog(visible ? "hide" : "restore")}
              >
                {visible ? (
                  <EyeOff className="size-3.5" aria-hidden="true" />
                ) : (
                  <Eye className="size-3.5" aria-hidden="true" />
                )}
                Вид.
              </button>
            ) : null}
            <button
              type="button"
              className={staff}
              title="Редагувати допис"
              disabled={!canEdit}
              aria-pressed={editing}
              onClick={() => setEditing(!editing)}
            >
              <Pencil className="size-3.5" aria-hidden="true" />
              Ред.
            </button>
            <button
              type="button"
              className={staff}
              disabled={!abilities.network}
              title={
                abilities.network
                  ? "IP та User-Agent автора (перегляд записується в журнал)"
                  : "IP та User-Agent доступні модераторам і адміністраторам"
              }
              onClick={() => setDialog("network")}
            >
              <Fingerprint className="size-3.5" aria-hidden="true" />
              IP+UA
            </button>
          </div>
        </div>
      ) : null}

      {abilities.network ? (
        <ForumPostNetworkDialog
          {...dialogProps("network")}
          postId={post.id}
          postNumber={post.number}
          canErase={abilities.networkDelete === true}
        />
      ) : null}

      <ForumActionDialog
        {...dialogProps("accept")}
        title={`Прийняти допис #${post.number} як відповідь?`}
        description="Автор відповіді отримає +10 балів (один раз на допис)."
        confirmLabel="Прийняти"
        run={() => acceptForumAnswer(topicId, post.id, path)}
      />
      <ForumActionDialog
        {...dialogProps("hide")}
        title={`Приховати допис #${post.number}`}
        description="Учасники побачать лише позначку; модератори бачать вміст і можуть відновити."
        confirmLabel="Приховати"
        fields={reasonField}
        run={(values) =>
          moderateForumPost(post.id, "HIDE", values.reason, path)
        }
      />
      <ForumActionDialog
        {...dialogProps("restore")}
        title={`Відновити допис #${post.number}?`}
        confirmLabel="Відновити"
        run={() => moderateForumPost(post.id, "RESTORE", "", path)}
      />
      <ForumActionDialog
        {...dialogProps("delete")}
        title={`Видалити допис #${post.number}`}
        description="Допис зникне для учасників; модератор може відновити будь-коли."
        confirmLabel="Видалити"
        destructive
        fields={reasonField}
        run={(values) =>
          moderateForumPost(post.id, "DELETE", values.reason, path)
        }
      />
      <ForumActionDialog
        {...dialogProps("note")}
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
        run={(values) => addForumStaffNote(post.id, values.body.trim(), path)}
      />
      {ban ? (
        <ForumActionDialog
          {...dialogProps("ban")}
          title={`Перманентний бан: ${ban.authorName}`}
          description={
            ban.rules.length
              ? "Учасник втратить будь-який доступ, навіть читання. Зняти бан зможе лише адміністратор. Учасник побачить правило, коментар, ваше ім'я та цей допис і зможе подати одну апеляцію."
              : "Спочатку додайте правила спільноти: Command Deck → Модерація → Правила спільноти."
          }
          confirmLabel="Забанити назавжди"
          destructive
          fields={[
            {
              name: "ruleId",
              label: "Порушене правило",
              kind: "select",
              required: true,
              options: ban.rules.map((rule) => ({
                value: rule.id,
                label: `${rule.code}. ${rule.text}`.slice(0, 120),
              })),
            },
            {
              name: "reason",
              label: "Коментар (його побачить учасник)",
              kind: "textarea",
              required: true,
            },
          ]}
          run={(values) =>
            banForumAuthor({
              subjectId: ban.authorId,
              ruleId: values.ruleId,
              comment: values.reason.trim(),
              postId: post.id,
            })
          }
        />
      ) : null}
      <ForumActionDialog
        {...dialogProps("warn")}
        title="Попередження автору"
        description="Діє 30 днів і записується в приватний журнал санкцій. Третє активне попередження автоматично вмикає «лише читання» на 7 днів."
        confirmLabel="Видати попередження"
        fields={reasonField}
        run={(values) => warnForumPostAuthor(post.id, values.reason)}
      />
      <ForumActionDialog
        {...dialogProps("restrict")}
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
          ...reasonField,
        ]}
        run={(values) =>
          restrictForumPostAuthor(
            post.id,
            values.reason,
            new Date(Date.now() + Number(values.days) * 86_400_000),
          )
        }
      />
      <ForumActionDialog
        {...dialogProps("purge")}
        title={`Видалити допис #${post.number} назавжди?`}
        description="Текст і історія змін будуть стерті без можливості відновлення. Лише для секретів, шкідливого коду та юридичних запитів."
        confirmLabel="Видалити назавжди"
        destructive
        fields={reasonField}
        run={(values) => purgeForumPost(post.id, values.reason, path)}
      />
    </div>
  );
}
