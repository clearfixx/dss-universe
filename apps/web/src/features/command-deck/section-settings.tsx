"use client";

/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Command Deck
 * 📄 File: apps/web/src/features/command-deck/section-settings.tsx
 *
 * 🎯 Purpose:
 * Command Deck › Community Hub › Розділ (owner mockup "доступ і видимість
 * форуму"): role matrix, visibility, hidden content, section moderators,
 * switches and limits of one forum section.
 *
 * ⚠️ Important:
 * Field changes wait for "Зберегти зміни" (one audited save). Moderator
 * assignments apply immediately, like any staff assignment.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import {
  Check,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  MessageSquareText,
  PenLine,
  Plus,
  Settings2,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import type { ForumAccessRole, ForumGateBlockType } from "@/gql/graphql";
import { cn } from "@/lib/utils";

import {
  assignForumModerator,
  lookupMembers,
  revokeForumModerator,
  saveForumSettings,
} from "./command-deck-actions";
import type { AdminModerator, AdminSectionAccess } from "./command-deck-data";
import {
  LabeledInput,
  LabeledNumber,
  LabeledText,
} from "./community-hub-settings";
import {
  Card,
  MatrixEditor,
  ROLE_FLOORS,
  ROLES,
  Tabs,
  Toggle,
  field,
  lockRow,
  toForumInput,
  type AccessRow,
  type ForumDraft,
} from "./community-hub-admin-kit";

type SectionTab =
  | "basics"
  | "access"
  | "moderators"
  | "content"
  | "integrations"
  | "extra";

const TABS: ReadonlyArray<{ id: SectionTab; label: string; soon?: boolean }> = [
  { id: "basics", label: "Основні" },
  { id: "access", label: "Доступ і видимість" },
  { id: "moderators", label: "Модератори" },
  { id: "content", label: "Контент і обмеження" },
  { id: "integrations", label: "Інтеграції", soon: true },
  { id: "extra", label: "Додатково", soon: true },
];

const BLOCK_TYPES: ReadonlyArray<{ id: ForumGateBlockType; label: string }> = [
  { id: "TEXT", label: "Текст" },
  { id: "CODE", label: "Код" },
  { id: "MEDIA", label: "Медіа (зображення, відео)" },
  { id: "FILES", label: "Файли (вкладення)" },
];

/** "Учасник+" — the lowest role that holds the right, or "Ніхто". */
function lowest(rows: readonly AccessRow[], action: keyof AccessRow): string {
  const first = ROLES.find(
    ({ id }) => rows.find((row) => row.role === id)?.[action],
  );
  if (!first) return "Ніхто";
  if (first.id === "GUEST") return "Усі";
  if (first.id === "ADMIN") return "Адміністратор";
  return `${first.label}+`;
}

export function SectionSettings({
  forum: initial,
  categoryTitle,
  access,
  moderators,
  initialTab,
}: {
  forum: ForumDraft;
  categoryTitle: string;
  access: AdminSectionAccess;
  moderators: readonly AdminModerator[];
  initialTab: SectionTab;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<SectionTab>(initialTab);
  const [forum, setForum] = useState(initial);
  const initialRows: AccessRow[] = access.effective.map((row) => ({
    role: row.role,
    view: row.view,
    read: row.read,
    createTopics: row.createTopics,
    reply: row.reply,
    editOwn: row.editOwn,
    deleteOwn: row.deleteOwn,
    moderate: row.moderate,
  }));
  const [rows, setRows] = useState(initialRows);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [formatDraft, setFormatDraft] = useState("");

  const forumDirty = JSON.stringify(forum) !== JSON.stringify(initial);
  const accessDirty = JSON.stringify(rows) !== JSON.stringify(initialRows);
  const dirty = forumDirty || accessDirty;

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const change = (next: Partial<ForumDraft>) => setForum({ ...forum, ...next });
  const setRole = (role: ForumAccessRole, next: Partial<AccessRow>) =>
    setRows(
      rows.map((row) =>
        row.role === role ? lockRow({ ...row, ...next }) : row,
      ),
    );

  function save() {
    setMessage(null);
    start(async () => {
      const result = await saveForumSettings({
        categories: [],
        forums: [
          {
            id: forum.id,
            input: toForumInput(forum),
            access: accessDirty ? rows : undefined,
            resetAccess: false,
          },
        ],
      });
      if (!result.ok) return setMessage(result.error.message);
      setMessage("Зміни збережено.");
      router.refresh();
    });
  }

  function resetAccess() {
    setMessage(null);
    start(async () => {
      const result = await saveForumSettings({
        categories: [],
        forums: [
          { id: forum.id, input: toForumInput(forum), resetAccess: true },
        ],
      });
      if (!result.ok) return setMessage(result.error.message);
      setMessage("Розділ знову успадковує права.");
      router.refresh();
    });
  }

  const tiles: ReadonlyArray<[string, string, typeof Eye]> = [
    ["Видимість", forum.listed ? "Усі учасники" : "Не в списках", Eye],
    ["Доступ до читання", lowest(rows, "read"), KeyRound],
    [
      "Створення тем",
      forum.allowTopics ? lowest(rows, "createTopics") : "Вимкнено",
      PenLine,
    ],
    [
      "Відповіді",
      forum.allowReplies ? lowest(rows, "reply") : "Вимкнено",
      MessageSquareText,
    ],
  ];

  const matrixCard = (
    <Card
      title="Права доступу"
      icon={
        <ShieldCheck className="size-5 text-violet-300" aria-hidden="true" />
      }
      action={
        <span className="text-xs text-slate-400">
          {access.source === "FORUM"
            ? "Власні права розділу"
            : access.source === "PARENT"
              ? "Успадковано від батьківського форуму"
              : access.source === "CATEGORY"
                ? "Успадковано від категорії"
                : "Типові права платформи"}
          {access.source === "FORUM" ? (
            <button
              type="button"
              onClick={resetAccess}
              className="ml-2 text-violet-300 hover:text-violet-200"
            >
              Успадковувати
            </button>
          ) : null}
        </span>
      }
    >
      <MatrixEditor rows={rows} onChange={setRows} />
    </Card>
  );

  const moderatorCard = (
    <ModeratorsCard
      categoryId={forum.categoryId}
      forumId={forum.id}
      parentId={forum.parentId}
      moderators={moderators}
      onChanged={() => router.refresh()}
    />
  );

  const extraCard = (
    <Card
      title="Додаткові налаштування"
      icon={<Settings2 className="size-5 text-violet-300" aria-hidden="true" />}
    >
      <div className="space-y-1 text-sm">
        <label className="flex items-center justify-between gap-3 py-1.5">
          <span>Статус розділу</span>
          <select
            className={cn(field, "w-44")}
            value={forum.active ? "on" : "off"}
            onChange={(event) =>
              change({ active: event.target.value === "on" })
            }
          >
            <option value="on">Активний</option>
            <option value="off">Прихований</option>
          </select>
        </label>
        <Toggle
          label="Приймати нові теми"
          checked={forum.allowTopics}
          onChange={(allowTopics) => change({ allowTopics })}
        />
        <Toggle
          label="Приймати нові відповіді"
          checked={forum.allowReplies}
          onChange={(allowReplies) => change({ allowReplies })}
        />
        <Toggle
          label="Дозволити опитування"
          checked={forum.allowPolls}
          onChange={(allowPolls) => change({ allowPolls })}
        />
        <Toggle
          label="Дозволити вкладення"
          checked={forum.allowAttachments}
          onChange={(allowAttachments) => change({ allowAttachments })}
        />
        <label className="flex items-center justify-between gap-3 py-1.5">
          <span>Макс. розмір вкладення</span>
          <select
            className={cn(field, "w-44")}
            value={forum.attachmentMaxMb ?? ""}
            onChange={(event) =>
              change({
                attachmentMaxMb: event.target.value
                  ? Number(event.target.value)
                  : null,
              })
            }
          >
            <option value="">Ліміт платформи</option>
            {[5, 10, 25, 50, 100].map((mb) => (
              <option key={mb} value={mb}>
                {mb} MB
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-start justify-between gap-3 py-1.5">
          <span className="pt-1">Дозволені формати</span>
          <div className="flex max-w-[16rem] flex-wrap justify-end gap-1.5">
            {forum.attachmentFormats.length === 0 ? (
              <span className="text-xs text-slate-500">Будь-які</span>
            ) : null}
            {forum.attachmentFormats.map((format) => (
              <span
                key={format}
                className="inline-flex items-center gap-1 rounded-md bg-white/[0.06] px-2 py-0.5 text-xs"
              >
                {format}
                <button
                  type="button"
                  aria-label={`Прибрати ${format}`}
                  onClick={() =>
                    change({
                      attachmentFormats: forum.attachmentFormats.filter(
                        (item) => item !== format,
                      ),
                    })
                  }
                >
                  <X className="size-3" aria-hidden="true" />
                </button>
              </span>
            ))}
            <form
              className="flex"
              onSubmit={(event) => {
                event.preventDefault();
                const format = formatDraft
                  .trim()
                  .toLowerCase()
                  .replace(/^\./, "");
                if (format && !forum.attachmentFormats.includes(format)) {
                  change({
                    attachmentFormats: [...forum.attachmentFormats, format],
                  });
                }
                setFormatDraft("");
              }}
            >
              <input
                aria-label="Новий формат"
                value={formatDraft}
                onChange={(event) => setFormatDraft(event.target.value)}
                placeholder="pdf"
                className="h-7 w-16 rounded-l-md border border-white/10 bg-transparent px-2 text-xs"
              />
              <button
                type="submit"
                aria-label="Додати формат"
                className="rounded-r-md border border-l-0 border-white/10 px-1.5"
              >
                <Plus className="size-3.5" aria-hidden="true" />
              </button>
            </form>
          </div>
        </div>
        <label className="flex items-center justify-between gap-3 py-1.5">
          <span>Автозакриття неактивних тем</span>
          <select
            className={cn(field, "w-44")}
            value={forum.autoCloseDays ?? ""}
            onChange={(event) =>
              change({
                autoCloseDays: event.target.value
                  ? Number(event.target.value)
                  : null,
              })
            }
          >
            <option value="">Вимкнено</option>
            {[30, 60, 90, 180, 365].map((days) => (
              <option key={days} value={days}>
                Через {days} днів
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center justify-between gap-3 py-1.5">
          <span>Закріплені теми (ліміт)</span>
          <input
            type="number"
            min={0}
            max={100}
            placeholder="без ліміту"
            className={cn(field, "w-44")}
            value={forum.pinnedLimit ?? ""}
            onChange={(event) =>
              change({
                pinnedLimit:
                  event.target.value === "" ? null : Number(event.target.value),
              })
            }
          />
        </label>
        <label className="flex items-center justify-between gap-3 py-1.5">
          <span>Порядок у категорії</span>
          <input
            type="number"
            min={0}
            className={cn(field, "w-44")}
            value={forum.position}
            onChange={(event) =>
              change({ position: Number(event.target.value) })
            }
          />
        </label>
      </div>
    </Card>
  );

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center gap-4">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-violet-600/25 text-violet-200">
          <MessageSquareText className="size-7" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="flex flex-wrap items-center gap-3 text-3xl font-bold tracking-tight">
            Розділ: {initial.title}
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-sm font-medium",
                initial.active
                  ? "bg-emerald-500/15 text-emerald-300"
                  : "bg-white/[0.06] text-slate-400",
              )}
            >
              {initial.active ? (
                <span className="size-2 rounded-full bg-emerald-400" />
              ) : (
                <EyeOff className="size-3.5" aria-hidden="true" />
              )}
              {initial.active ? "Активний" : "Прихований"}
            </span>
          </h1>
          <p className="text-sm text-slate-400">
            {initial.parentId ? "Підфорум" : "Форум"} у категорії «
            {categoryTitle}». Налаштування доступу, модерації та видимості.
          </p>
        </div>
        <Link
          href={`/community/forum/${initial.id}`}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/15 px-4 text-sm font-medium hover:border-violet-400"
        >
          <ExternalLink className="size-4" aria-hidden="true" />
          Переглянути на сайті
        </Link>
        <button
          type="button"
          onClick={save}
          disabled={!dirty || pending}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white shadow-[0_0_24px_rgba(124,58,237,.35)] hover:bg-violet-500 disabled:opacity-50"
        >
          <Check className="size-4" aria-hidden="true" />
          {pending ? "Зберігаємо…" : "Зберегти зміни"}
        </button>
      </header>
      {message ? (
        <p
          role="status"
          className={cn(
            "rounded-lg px-3 py-2 text-sm",
            message.startsWith("Зміни") || message.startsWith("Розділ")
              ? "bg-emerald-500/10 text-emerald-200"
              : "bg-rose-500/10 text-rose-200",
          )}
        >
          {message}
        </p>
      ) : dirty ? (
        <p className="text-xs text-amber-200">Є незбережені зміни.</p>
      ) : null}

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === "basics" ? (
        <Card
          title="Основні"
          icon={
            <PenLine className="size-5 text-violet-300" aria-hidden="true" />
          }
          className="max-w-3xl"
        >
          <div className="space-y-3 text-sm">
            <LabeledInput
              label="Назва"
              value={forum.title}
              onChange={(title) => change({ title })}
            />
            <LabeledInput
              label="Slug"
              value={forum.slug}
              onChange={(slug) => change({ slug })}
            />
            <LabeledText
              label="Опис"
              max={300}
              value={forum.description ?? ""}
              onChange={(description) =>
                change({ description: description || null })
              }
            />
            <LabeledNumber
              label="Порядок"
              value={forum.position}
              onChange={(position) => change({ position })}
            />
            <Toggle
              label="Активний розділ"
              checked={forum.active}
              onChange={(active) => change({ active })}
            />
          </div>
        </Card>
      ) : tab === "moderators" ? (
        <div className="max-w-3xl">{moderatorCard}</div>
      ) : tab === "content" ? (
        <div className="max-w-3xl">{extraCard}</div>
      ) : (
        <div className="grid gap-5 2xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <div className="min-w-0 space-y-5">
            <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {tiles.map(([label, value, Icon]) => (
                <div
                  key={label}
                  className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-[#0f0f24] p-4"
                >
                  <span className="flex size-11 items-center justify-center rounded-xl bg-violet-500/15 text-violet-200">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <div className="flex flex-col-reverse">
                    <dd className="flex items-center gap-1.5 text-sm font-semibold">
                      <span
                        className="size-2 rounded-full bg-emerald-400"
                        aria-hidden="true"
                      />
                      {value}
                    </dd>
                    <dt className="text-xs text-slate-400">{label}</dt>
                  </div>
                </div>
              ))}
            </dl>
            {matrixCard}
            <div className="grid gap-5 lg:grid-cols-2">
              <Card
                title="Видимість розділу"
                icon={
                  <Eye className="size-5 text-violet-300" aria-hidden="true" />
                }
              >
                <div className="space-y-3 text-sm">
                  <label className="block space-y-1">
                    <span className="text-xs text-slate-400">
                      Тип видимості
                    </span>
                    <select
                      className={field}
                      value={forum.listed ? "listed" : "unlisted"}
                      onChange={(event) =>
                        change({ listed: event.target.value === "listed" })
                      }
                    >
                      <option value="listed">
                        Публічний (у списку форумів)
                      </option>
                      <option value="unlisted">
                        Лише за посиланням (не в списках)
                      </option>
                    </select>
                  </label>
                  <div>
                    <span className="text-xs text-slate-400">
                      Видимий для ролей
                    </span>
                    <div className="mt-1 flex flex-wrap gap-1.5 rounded-lg border border-white/[0.09] bg-[#0b0b1c] p-1.5">
                      {ROLES.map(({ id, label }) => {
                        const on = rows.find((row) => row.role === id)!.view;
                        return (
                          <button
                            key={id}
                            type="button"
                            aria-pressed={on}
                            disabled={id === "ADMIN"}
                            onClick={() =>
                              setRole(id, {
                                view: !on,
                                ...(on ? {} : { read: true }),
                              })
                            }
                            className={cn(
                              "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs disabled:opacity-70",
                              on
                                ? "bg-violet-600/30 text-violet-100"
                                : "bg-white/[0.04] text-slate-500 line-through",
                            )}
                          >
                            {label}
                            {on && id !== "ADMIN" ? (
                              <X className="size-3" aria-hidden="true" />
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <Toggle
                    label="Показувати в загальному списку форумів"
                    checked={forum.listed}
                    onChange={(listed) => change({ listed })}
                  />
                  <Toggle
                    label="Індексувати в пошуку"
                    checked={forum.searchable}
                    onChange={(searchable) => change({ searchable })}
                  />
                  <Toggle
                    label="Показувати кількість тем і відповідей"
                    checked={forum.showCounts}
                    onChange={(showCounts) => change({ showCounts })}
                  />
                </div>
              </Card>
              <Card
                title="Прихований контент"
                icon={
                  <Lock className="size-5 text-violet-300" aria-hidden="true" />
                }
              >
                <div className="space-y-2 text-sm">
                  <Toggle
                    label="Дозволити приховані блоки (spoiler)"
                    checked={forum.allowsGatedContent}
                    onChange={(allowsGatedContent) =>
                      change({ allowsGatedContent })
                    }
                  />
                  <label className="flex items-center justify-between gap-3">
                    <span>Перегляд прихованого контенту</span>
                    <select
                      className={cn(field, "w-40")}
                      value={forum.gateViewRole}
                      onChange={(event) =>
                        change({
                          gateViewRole: event.target.value as ForumAccessRole,
                        })
                      }
                    >
                      {ROLE_FLOORS.map(({ id, label }) => (
                        <option key={id} value={id}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex items-center justify-between gap-3">
                    <span>Створення прихованого контенту</span>
                    <select
                      className={cn(field, "w-40")}
                      value={forum.gateCreateRole}
                      onChange={(event) =>
                        change({
                          gateCreateRole: event.target.value as ForumAccessRole,
                        })
                      }
                    >
                      {ROLE_FLOORS.filter(({ id }) => id !== "GUEST").map(
                        ({ id, label }) => (
                          <option key={id} value={id}>
                            {label}
                          </option>
                        ),
                      )}
                    </select>
                  </label>
                  <fieldset className="pt-1">
                    <legend className="mb-1 text-xs text-slate-400">
                      Дозволені типи прихованих блоків
                    </legend>
                    {BLOCK_TYPES.map(({ id, label }) => {
                      const on = forum.gateBlockTypes.includes(id);
                      return (
                        <label
                          key={id}
                          className="flex items-center gap-2.5 py-1"
                        >
                          <input
                            type="checkbox"
                            checked={on}
                            disabled={on && forum.gateBlockTypes.length === 1}
                            onChange={() =>
                              change({
                                gateBlockTypes: on
                                  ? forum.gateBlockTypes.filter(
                                      (item) => item !== id,
                                    )
                                  : [...forum.gateBlockTypes, id],
                              })
                            }
                            className="size-4 accent-violet-500"
                          />
                          {label}
                        </label>
                      );
                    })}
                  </fieldset>
                </div>
              </Card>
            </div>
          </div>
          <div className="min-w-0 space-y-5">
            {moderatorCard}
            {extraCard}
          </div>
        </div>
      )}
    </div>
  );
}

function ModeratorsCard({
  categoryId,
  forumId,
  parentId,
  moderators,
  onChanged,
}: {
  categoryId: string;
  forumId: string;
  parentId: string | null;
  moderators: readonly AdminModerator[];
  onChanged: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [term, setTerm] = useState("");
  const [found, setFound] = useState<
    ReadonlyArray<{ id: string; username: string; displayName: string | null }>
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const relevant = moderators.filter(
    (item) =>
      item.forumId === null ||
      item.forumId === forumId ||
      item.forumId === parentId,
  );

  return (
    <Card
      title="Модератори розділу"
      icon={<Users className="size-5 text-violet-300" aria-hidden="true" />}
      action={
        <button
          type="button"
          onClick={() => setAdding(!adding)}
          className="inline-flex h-8 items-center gap-1 rounded-lg bg-violet-600/30 px-2.5 text-xs font-semibold text-violet-100 hover:bg-violet-600/50"
        >
          <Plus className="size-3.5" aria-hidden="true" />
          Призначити
        </button>
      }
    >
      {adding ? (
        <div className="mb-3 space-y-2">
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              start(async () => {
                const result = await lookupMembers(term);
                setFound(result.ok ? result.data : []);
                setError(result.ok ? null : result.error.message);
              });
            }}
          >
            <input
              aria-label="Пошук учасника"
              placeholder="Ім'я або @username"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              className={field}
            />
            <button
              type="submit"
              className="h-10 rounded-lg border border-white/15 px-3 text-sm"
            >
              Знайти
            </button>
          </form>
          <ul className="space-y-1">
            {found.map((member) => (
              <li key={member.id}>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      const result = await assignForumModerator(
                        categoryId,
                        forumId,
                        member.id,
                      );
                      if (!result.ok) return setError(result.error.message);
                      setAdding(false);
                      setFound([]);
                      setTerm("");
                      onChanged();
                    })
                  }
                  className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-white/[0.05]"
                >
                  <span>
                    {member.displayName || member.username}{" "}
                    <span className="text-xs text-slate-500">
                      @{member.username}
                    </span>
                  </span>
                  <span className="text-xs text-violet-300">Призначити</span>
                </button>
              </li>
            ))}
          </ul>
          {error ? (
            <p role="alert" className="text-sm text-rose-300">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
      {relevant.length === 0 ? (
        <p className="text-sm text-slate-400">Модераторів ще не призначено.</p>
      ) : (
        <ul className="space-y-1">
          {relevant.map((item) => {
            const name =
              item.moderator?.displayName ||
              item.moderator?.username ||
              "Учасник";
            return (
              <li key={item.id} className="flex items-center gap-3 py-1.5">
                <span className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-700 text-xs font-bold">
                  {name.slice(0, 2).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {name}
                </span>
                <span className="rounded-md bg-violet-600/25 px-2 py-0.5 text-xs text-violet-100">
                  {item.forumId === null
                    ? "Модератор категорії"
                    : item.forumId === forumId
                      ? "Модератор"
                      : "Модератор форуму-батька"}
                </span>
                {item.forumId === forumId ? (
                  <button
                    type="button"
                    aria-label={`Зняти ${name}`}
                    disabled={pending}
                    onClick={() =>
                      start(async () => {
                        const result = await revokeForumModerator(item.id);
                        if (!result.ok) return setError(result.error.message);
                        onChanged();
                      })
                    }
                    className="rounded-md p-1 text-slate-400 hover:bg-white/[0.06] hover:text-rose-300"
                  >
                    <X className="size-4" aria-hidden="true" />
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-3 text-xs text-slate-500">
        Супермодератори (глобальне право) модерують усі розділи й тут не
        показуються.
      </p>
    </Card>
  );
}
