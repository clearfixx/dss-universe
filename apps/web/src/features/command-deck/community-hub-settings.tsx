"use client";

/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Command Deck
 * 📄 File: apps/web/src/features/command-deck/community-hub-settings.tsx
 *
 * 🎯 Purpose:
 * Command Deck › Community Hub › Налаштування (owner mockup "Налаштування
 * Community Hub"): counters, the section tree with an edit panel, the role
 * matrix of the selected section and sanctions. XP rules live on Gamification
 * › Правила XP (P1 C06), not here. Every change waits
 * for "Зберегти зміни" (owner decision), with an unsaved-changes warning.
 *
 * ⚠️ Important:
 * Tabs without a backend yet are shown as "скоро". The API validates and
 * audits every saved change.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import {
  Check,
  ChevronDown,
  ChevronRight,
  Code2,
  ExternalLink,
  Eye,
  EyeOff,
  Folder,
  Gauge,
  Layers,
  ListTree,
  Lock,
  MessagesSquare,
  Pencil,
  Plus,
  Scale,
  ShieldCheck,
  Trophy,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

import type {
  AdminCategory,
  AdminSectionAccess,
  CommunityHubAdmin,
} from "./command-deck-data";
import {
  createForum,
  createForumCategory,
  saveForumSettings,
  updateSanctionPolicy,
} from "./command-deck-actions";
import {
  ACTIONS,
  Card,
  MatrixEditor,
  Tabs,
  Toggle,
  field,
  toForumDraft,
  toForumInput,
  type AccessRow,
  type ForumDraft,
} from "./community-hub-admin-kit";
import { cn } from "@/lib/utils";

import { ForumTagsManager } from "./forum-tags-manager";

type HubTab =
  | "general"
  | "structure"
  | "moderation"
  | "sanctions"
  | "points"
  | "tags"
  | "notifications"
  | "integrations"
  | "extra";

const HUB_TABS: ReadonlyArray<{ id: HubTab; label: string; soon?: boolean }> = [
  { id: "general", label: "Загальні", soon: true },
  { id: "structure", label: "Структура форуму" },
  { id: "moderation", label: "Модерація", soon: true },
  { id: "sanctions", label: "Санкції" },
  { id: "points", label: "Рейтинг і XP", soon: true },
  { id: "tags", label: "Теги" },
  { id: "notifications", label: "Сповіщення", soon: true },
  { id: "integrations", label: "Інтеграції", soon: true },
  { id: "extra", label: "Додатково", soon: true },
];

const VISIBILITY_LABEL = {
  PUBLIC: "Усі",
  MEMBERS: "Учасники",
  RESTRICTED: "За ролями",
} as const;

type CategoryDraft = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  position: number;
  active: boolean;
  visibility: AdminCategory["visibility"];
  audienceKeys: string[];
};

type Selection = { kind: "category" | "forum"; id: string } | null;

function flattenForums(categories: readonly AdminCategory[]): ForumDraft[] {
  return categories.flatMap((category) =>
    category.forums.flatMap((forum) => [
      toForumDraft(forum),
      ...forum.subforums.map((sub) => toForumDraft(sub)),
    ]),
  );
}

export function CommunityHubSettings({
  data,
  selected,
  access,
}: {
  data: CommunityHubAdmin;
  selected: Selection;
  access: AdminSectionAccess | null;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<HubTab>("structure");
  const initialCategories = useMemo<CategoryDraft[]>(
    () =>
      data.forumCategories.map((category) => ({
        id: category.id,
        slug: category.slug,
        title: category.title,
        description: category.description,
        position: category.position,
        active: category.active,
        visibility: category.visibility,
        audienceKeys: category.audienceKeys ?? [],
      })),
    [data.forumCategories],
  );
  const initialForums = useMemo(
    () => flattenForums(data.forumCategories),
    [data.forumCategories],
  );
  const [categories, setCategories] = useState(initialCategories);
  const [forums, setForums] = useState(initialForums);
  const [rows, setRows] = useState<AccessRow[] | null>(
    access
      ? access.effective.map((row) => ({
          role: row.role,
          view: row.view,
          read: row.read,
          createTopics: row.createTopics,
          reply: row.reply,
          editOwn: row.editOwn,
          deleteOwn: row.deleteOwn,
          moderate: row.moderate,
        }))
      : null,
  );
  const [accessDirty, setAccessDirty] = useState(false);
  const [policy, setPolicy] = useState(data.moderationSanctionPolicy);
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(data.forumCategories.map(({ id }) => id)),
  );
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const dirtyCategories = categories.filter(
    (draft, index) =>
      JSON.stringify(draft) !== JSON.stringify(initialCategories[index]),
  );
  const dirtyForums = forums.filter(
    (draft) =>
      JSON.stringify(draft) !==
      JSON.stringify(initialForums.find(({ id }) => id === draft.id)),
  );
  const policyDirty =
    JSON.stringify(policy) !== JSON.stringify(data.moderationSanctionPolicy);
  const dirty =
    dirtyCategories.length > 0 ||
    dirtyForums.length > 0 ||
    accessDirty ||
    policyDirty;

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const forum =
    selected?.kind === "forum"
      ? (forums.find(({ id }) => id === selected.id) ?? null)
      : null;
  const category =
    selected?.kind === "category"
      ? (categories.find(({ id }) => id === selected.id) ?? null)
      : null;

  const updateForum = (id: string, change: Partial<ForumDraft>) =>
    setForums((list) =>
      list.map((item) => (item.id === id ? { ...item, ...change } : item)),
    );
  const updateCategory = (id: string, change: Partial<CategoryDraft>) =>
    setCategories((list) =>
      list.map((item) => (item.id === id ? { ...item, ...change } : item)),
    );

  function save() {
    setMessage(null);
    start(async () => {
      const accessFor = (kind: "category" | "forum", id: string) =>
        accessDirty && rows && selected?.kind === kind && selected.id === id
          ? rows
          : undefined;
      const needsAccess =
        accessDirty &&
        selected &&
        !(selected.kind === "forum"
          ? dirtyForums.some(({ id }) => id === selected.id)
          : dirtyCategories.some(({ id }) => id === selected.id));
      const categoryChanges = [
        ...dirtyCategories,
        ...(needsAccess && selected?.kind === "category" && category
          ? [category]
          : []),
      ];
      const forumChanges = [
        ...dirtyForums,
        ...(needsAccess && selected?.kind === "forum" && forum ? [forum] : []),
      ];
      if (categoryChanges.length || forumChanges.length) {
        const result = await saveForumSettings({
          categories: categoryChanges.map((draft) => ({
            id: draft.id,
            resetAccess: false,
            access: accessFor("category", draft.id),
            input: {
              slug: draft.slug,
              title: draft.title,
              description: draft.description,
              position: draft.position,
              active: draft.active,
              visibility: draft.visibility,
              audienceKeys: draft.audienceKeys,
            },
          })),
          forums: forumChanges.map((draft) => ({
            id: draft.id,
            resetAccess: false,
            access: accessFor("forum", draft.id),
            input: toForumInput(draft),
          })),
        });
        if (!result.ok) return setMessage(result.error.message);
      }
      if (policyDirty) {
        const result = await updateSanctionPolicy({
          escalationWarningCount: policy.escalationWarningCount,
          escalationReadOnlyDays: policy.escalationReadOnlyDays,
          warningLifetimeDays: policy.warningLifetimeDays,
          readOnlyMaxDays: policy.readOnlyMaxDays,
        });
        if (!result.ok) return setMessage(result.error.message);
      }
      setAccessDirty(false);
      setMessage("Зміни збережено.");
      router.refresh();
    });
  }

  // ── counters ─────────────────────────────────────────────────
  const topForums = forums.filter(({ parentId }) => parentId === null);
  const subforums = forums.filter(({ parentId }) => parentId !== null);
  const sections = categories.length + forums.length;
  const activeSections =
    categories.filter(({ active }) => active).length +
    forums.filter(({ active }) => active).length;
  const hidden =
    categories.filter(({ visibility }) => visibility === "RESTRICTED").length +
    forums.filter(({ listed }) => !listed).length;
  const depth = sections
    ? (categories.length + topForums.length * 2 + subforums.length * 3) /
      sections
    : 0;
  const tiles: ReadonlyArray<[string, string | number, string, typeof Layers]> =
    [
      ["Категорій", categories.length, "", Layers],
      ["Форумів", topForums.length, "", MessagesSquare],
      ["Підфорумів", subforums.length, "", ListTree],
      [
        "Активних розділів",
        `${activeSections} / ${sections}`,
        sections
          ? `${Math.round((activeSections / sections) * 100)}% активні`
          : "",
        Eye,
      ],
      ["Прихованих розділів", hidden, "Не в списках або за ролями", Lock],
      ["Середня глибина", depth.toFixed(1), "Рівні: макс. 3", Gauge],
    ];

  const select = (next: Selection) => {
    const params = new URLSearchParams();
    if (next) params.set(next.kind, next.id);
    router.push(`/command-deck/community-hub?${params.toString()}`, {
      scroll: false,
    });
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center gap-4">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-violet-600/25 text-violet-200">
          <MessagesSquare className="size-7" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Community Hub</h1>
          <p className="text-sm text-slate-400">
            Керування форумом, спільнотою та взаємодією користувачів.
          </p>
        </div>
        <Link
          href="/community"
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/15 px-4 text-sm font-medium hover:border-violet-400"
        >
          <ExternalLink className="size-4" aria-hidden="true" />
          Відкрити форум
        </Link>
        <Link
          href="/command-deck/gamification/xp-rules"
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/15 px-4 text-sm font-medium hover:border-violet-400"
        >
          <Trophy className="size-4" aria-hidden="true" />
          Правила XP
        </Link>
        <button
          type="button"
          onClick={save}
          disabled={!dirty || pending}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
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
            message === "Зміни збережено."
              ? "bg-emerald-500/10 text-emerald-200"
              : "bg-rose-500/10 text-rose-200",
          )}
        >
          {message}
        </p>
      ) : dirty ? (
        <p className="text-xs text-amber-200">Є незбережені зміни.</p>
      ) : null}

      <Tabs tabs={HUB_TABS} active={tab} onChange={setTab} />

      {tab === "structure" ? (
        <>
          <dl className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
            {tiles.map(([label, value, hint, Icon]) => (
              <div
                key={label}
                className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-card p-4"
              >
                <span className="flex size-11 items-center justify-center rounded-xl bg-violet-500/15 text-violet-200">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <div className="flex flex-col-reverse">
                  <dt className="text-xs text-slate-400">
                    {label}
                    {hint ? (
                      <span className="block text-[11px] text-slate-500">
                        {hint}
                      </span>
                    ) : null}
                  </dt>
                  <dd className="text-xl font-bold">{value}</dd>
                </div>
              </div>
            ))}
          </dl>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            <Card
              title="Структура форуму"
              icon={
                <ListTree
                  className="size-5 text-violet-300"
                  aria-hidden="true"
                />
              }
              action={
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setExpanded(
                        expanded.size
                          ? new Set()
                          : new Set(categories.map(({ id }) => id)),
                      )
                    }
                    className="inline-flex h-8 items-center gap-1 rounded-lg border border-white/10 px-2.5 text-xs text-slate-200 hover:border-violet-400"
                  >
                    {expanded.size ? "Згорнути все" : "Розгорнути все"}
                    <ChevronDown className="size-3.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdding(true)}
                    className="inline-flex h-8 items-center gap-1 rounded-lg bg-violet-600 px-2.5 text-xs font-semibold text-white hover:bg-violet-500"
                  >
                    <Plus className="size-3.5" aria-hidden="true" />
                    Додати розділ
                  </button>
                </div>
              }
            >
              <div className="-mx-4 -my-4 overflow-x-auto">
                <table className="w-full min-w-[40rem] text-sm">
                  <thead>
                    <tr className="text-xs text-slate-400">
                      <th className="px-4 py-2.5 text-left font-medium">
                        Розділ / Форум
                      </th>
                      <th className="py-2.5 text-left font-medium">Тип</th>
                      <th className="py-2.5 text-left font-medium">Статус</th>
                      <th className="py-2.5 text-left font-medium">
                        Видимість
                      </th>
                      <th className="py-2.5 text-right font-medium">Порядок</th>
                      <th className="w-12 py-2.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {[...categories]
                      .sort((a, b) => a.position - b.position)
                      .map((cat) => {
                        const open = expanded.has(cat.id);
                        const children = forums
                          .filter(
                            (item) =>
                              item.categoryId === cat.id && !item.parentId,
                          )
                          .sort((a, b) => a.position - b.position);
                        return [
                          <Row
                            key={cat.id}
                            depth={0}
                            title={cat.title}
                            kind="Категорія"
                            active={cat.active}
                            visibility={VISIBILITY_LABEL[cat.visibility]}
                            position={cat.position}
                            count={children.length}
                            open={open}
                            selected={
                              selected?.kind === "category" &&
                              selected.id === cat.id
                            }
                            onToggle={() =>
                              setExpanded((set) => {
                                const next = new Set(set);
                                if (next.has(cat.id)) next.delete(cat.id);
                                else next.add(cat.id);
                                return next;
                              })
                            }
                            onSelect={() =>
                              select({ kind: "category", id: cat.id })
                            }
                          />,
                          ...(open
                            ? children.flatMap((item) => [
                                <Row
                                  key={item.id}
                                  depth={1}
                                  title={item.title}
                                  kind="Форум"
                                  active={item.active}
                                  visibility={
                                    item.listed ? "Усі" : "Не в списку"
                                  }
                                  position={item.position}
                                  selected={
                                    selected?.kind === "forum" &&
                                    selected.id === item.id
                                  }
                                  onSelect={() =>
                                    select({ kind: "forum", id: item.id })
                                  }
                                />,
                                ...forums
                                  .filter((sub) => sub.parentId === item.id)
                                  .sort((a, b) => a.position - b.position)
                                  .map((sub) => (
                                    <Row
                                      key={sub.id}
                                      depth={2}
                                      title={sub.title}
                                      kind="Підфорум"
                                      active={sub.active}
                                      visibility={
                                        sub.listed ? "Усі" : "Не в списку"
                                      }
                                      position={sub.position}
                                      selected={
                                        selected?.kind === "forum" &&
                                        selected.id === sub.id
                                      }
                                      onSelect={() =>
                                        select({ kind: "forum", id: sub.id })
                                      }
                                    />
                                  )),
                              ])
                            : []),
                        ];
                      })}
                  </tbody>
                </table>
              </div>
            </Card>

            {forum ? (
              <ForumPanel
                forum={forum}
                categories={categories}
                forums={forums}
                onChange={(change) => updateForum(forum.id, change)}
              />
            ) : category ? (
              <Card
                title={`Категорія: ${category.title}`}
                icon={
                  <Folder
                    className="size-5 text-violet-300"
                    aria-hidden="true"
                  />
                }
              >
                <div className="space-y-3 text-sm">
                  <LabeledInput
                    label="Назва"
                    value={category.title}
                    onChange={(title) => updateCategory(category.id, { title })}
                  />
                  <LabeledText
                    label="Опис"
                    value={category.description ?? ""}
                    onChange={(description) =>
                      updateCategory(category.id, {
                        description: description || null,
                      })
                    }
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="space-y-1">
                      <span className="text-xs text-slate-400">Видимість</span>
                      <select
                        className={field}
                        value={category.visibility}
                        onChange={(event) =>
                          updateCategory(category.id, {
                            visibility: event.target
                              .value as CategoryDraft["visibility"],
                            audienceKeys:
                              event.target.value === "RESTRICTED"
                                ? category.audienceKeys
                                : [],
                          })
                        }
                      >
                        <option value="PUBLIC">Усі</option>
                        <option value="MEMBERS">Лише учасники</option>
                        <option value="RESTRICTED">За ролями й групами</option>
                      </select>
                    </label>
                    <LabeledNumber
                      label="Порядок"
                      value={category.position}
                      onChange={(position) =>
                        updateCategory(category.id, { position })
                      }
                    />
                  </div>
                  {category.visibility === "RESTRICTED" ? (
                    <LabeledInput
                      label="Аудиторія (role:… або group:…, через кому)"
                      value={category.audienceKeys.join(", ")}
                      onChange={(value) =>
                        updateCategory(category.id, {
                          audienceKeys: value
                            .split(",")
                            .map((key) => key.trim())
                            .filter(Boolean),
                        })
                      }
                    />
                  ) : null}
                  <Toggle
                    label="Активна категорія"
                    checked={category.active}
                    onChange={(active) =>
                      updateCategory(category.id, { active })
                    }
                  />
                </div>
              </Card>
            ) : (
              <Card
                title="Оберіть розділ"
                icon={
                  <Pencil
                    className="size-5 text-violet-300"
                    aria-hidden="true"
                  />
                }
              >
                <p className="text-sm text-slate-400">
                  Натисніть на категорію чи форум у таблиці, щоб змінити його
                  налаштування.
                </p>
              </Card>
            )}
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card
              title="Права доступу"
              icon={
                <ShieldCheck
                  className="size-5 text-violet-300"
                  aria-hidden="true"
                />
              }
              action={
                forum ? (
                  <Link
                    href={`/command-deck/community-hub/sections/${forum.id}`}
                    className="text-sm text-violet-300 hover:text-violet-200"
                  >
                    Керувати
                  </Link>
                ) : null
              }
            >
              {rows && selected ? (
                <>
                  <MatrixEditor
                    rows={rows}
                    actions={ACTIONS.filter(({ id }) =>
                      ["read", "createTopics", "reply", "moderate"].includes(
                        id,
                      ),
                    ).map((action) =>
                      action.id === "read"
                        ? { ...action, label: "Читання" }
                        : action,
                    )}
                    onChange={(next) => {
                      setRows(next);
                      setAccessDirty(true);
                    }}
                  />
                  <p className="mt-2 text-xs text-slate-500">
                    {access?.source === "DEFAULT"
                      ? "Діють типові права платформи."
                      : access?.source === "CATEGORY" &&
                          selected.kind === "forum"
                        ? "Успадковано від категорії."
                        : access?.source === "PARENT"
                          ? "Успадковано від батьківського форуму."
                          : "Власні права розділу."}
                  </p>
                </>
              ) : (
                <p className="text-sm text-slate-400">
                  Оберіть розділ у таблиці.
                </p>
              )}
            </Card>
            <Card
              title="Політика санкцій"
              icon={
                <Scale className="size-5 text-violet-300" aria-hidden="true" />
              }
              action={
                <button
                  type="button"
                  onClick={() => setTab("sanctions")}
                  className="text-sm text-violet-300 hover:text-violet-200"
                >
                  Редагувати
                </button>
              }
            >
              <ul className="space-y-3 text-sm">
                <li>
                  <p className="font-medium">Попередження → обмеження</p>
                  <p className="text-xs text-slate-400">
                    {policy.escalationWarningCount} попередження →{" "}
                    {policy.escalationReadOnlyDays} днів «Лише читання»
                  </p>
                </li>
                <li>
                  <p className="font-medium">Строк дії попередження</p>
                  <p className="text-xs text-slate-400">
                    {policy.warningLifetimeDays} днів
                  </p>
                </li>
                <li>
                  <p className="font-medium">Режим «Лише читання»</p>
                  <p className="text-xs text-slate-400">
                    Заборона створення тем і відповідей, до{" "}
                    {policy.readOnlyMaxDays} днів
                  </p>
                </li>
                <li>
                  <p className="font-medium">Ескалація порушень</p>
                  <p className="text-xs text-slate-400">
                    Автоматична, за повторні порушення
                  </p>
                </li>
              </ul>
            </Card>
          </div>
        </>
      ) : tab === "sanctions" ? (
        <Card
          title="Політика санкцій"
          icon={<Scale className="size-5 text-violet-300" aria-hidden="true" />}
        >
          <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
            <LabeledNumber
              label="Попереджень до обмеження"
              value={policy.escalationWarningCount}
              onChange={(value) =>
                setPolicy({ ...policy, escalationWarningCount: value })
              }
            />
            <LabeledNumber
              label="Днів «Лише читання» після ескалації"
              value={policy.escalationReadOnlyDays}
              onChange={(value) =>
                setPolicy({ ...policy, escalationReadOnlyDays: value })
              }
            />
            <LabeledNumber
              label="Строк дії попередження, днів"
              value={policy.warningLifetimeDays}
              onChange={(value) =>
                setPolicy({ ...policy, warningLifetimeDays: value })
              }
            />
            <LabeledNumber
              label="Максимум «Лише читання», днів"
              value={policy.readOnlyMaxDays}
              onChange={(value) =>
                setPolicy({ ...policy, readOnlyMaxDays: value })
              }
            />
          </div>
        </Card>
      ) : tab === "tags" ? (
        <ForumTagsManager forums={forums} />
      ) : null}

      {adding ? (
        <AddSectionDialog
          categories={categories}
          forums={forums.filter(({ parentId }) => parentId === null)}
          onClose={() => setAdding(false)}
          onCreated={(next) => {
            setAdding(false);
            select(next);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function Row({
  depth,
  title,
  kind,
  active,
  visibility,
  position,
  count,
  open,
  selected,
  onToggle,
  onSelect,
}: {
  depth: number;
  title: string;
  kind: string;
  active: boolean;
  visibility: string;
  position: number;
  count?: number;
  open?: boolean;
  selected: boolean;
  onToggle?: () => void;
  onSelect: () => void;
}) {
  return (
    <tr
      className={cn(
        "border-t border-white/[0.05]",
        selected && "bg-violet-600/15",
      )}
    >
      <td
        className="px-4 py-2"
        style={{ paddingLeft: `${1 + depth * 1.75}rem` }}
      >
        <span className="flex items-center gap-2">
          {onToggle ? (
            <button
              type="button"
              aria-label={open ? `Згорнути ${title}` : `Розгорнути ${title}`}
              onClick={onToggle}
              className="text-slate-400 hover:text-white"
            >
              {open ? (
                <ChevronDown className="size-4" aria-hidden="true" />
              ) : (
                <ChevronRight className="size-4" aria-hidden="true" />
              )}
            </button>
          ) : null}
          {depth === 0 ? (
            <Folder className="size-4 text-slate-300" aria-hidden="true" />
          ) : (
            <Code2 className="size-4 text-violet-300" aria-hidden="true" />
          )}
          <button
            type="button"
            onClick={onSelect}
            className={cn(
              "text-left hover:text-violet-200",
              depth === 0 && "font-semibold",
            )}
          >
            {title}
          </button>
          {count != null ? (
            <span className="rounded-md bg-violet-500/20 px-1.5 text-[11px] text-violet-100">
              {count} {count === 1 ? "форум" : count < 5 ? "форуми" : "форумів"}
            </span>
          ) : null}
        </span>
      </td>
      <td className="py-2 text-slate-300">{kind}</td>
      <td className="py-2">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs",
            active
              ? "bg-emerald-500/15 text-emerald-300"
              : "bg-white/[0.06] text-slate-400",
          )}
        >
          {active ? (
            <span className="size-1.5 rounded-full bg-emerald-400" />
          ) : (
            <EyeOff className="size-3" aria-hidden="true" />
          )}
          {active ? "Активний" : "Приховано"}
        </span>
      </td>
      <td className="py-2 text-slate-300">{visibility}</td>
      <td className="py-2 text-right text-slate-300">{position}</td>
      <td className="py-2 pr-3 text-right">
        <button
          type="button"
          aria-label={`Редагувати ${title}`}
          onClick={onSelect}
          className="rounded-md p-1 text-slate-400 hover:bg-white/[0.06] hover:text-white"
        >
          <Pencil className="size-4" aria-hidden="true" />
        </button>
      </td>
    </tr>
  );
}

function ForumPanel({
  forum,
  categories,
  forums,
  onChange,
}: {
  forum: ForumDraft;
  categories: readonly CategoryDraft[];
  forums: readonly ForumDraft[];
  onChange: (change: Partial<ForumDraft>) => void;
}) {
  const parents = forums.filter(
    (item) => item.parentId === null && item.id !== forum.id,
  );
  const parentValue = forum.parentId
    ? `forum:${forum.parentId}`
    : `category:${forum.categoryId}`;
  return (
    <Card
      title={`Форум: ${forum.title}`}
      icon={<Code2 className="size-5 text-violet-300" aria-hidden="true" />}
      action={
        <span
          className={cn(
            "rounded-md px-2 py-0.5 text-xs",
            forum.active
              ? "bg-emerald-500/15 text-emerald-300"
              : "bg-white/[0.06] text-slate-400",
          )}
        >
          {forum.active ? "Активний" : "Приховано"}
        </span>
      }
    >
      <div className="mb-3 flex flex-wrap gap-1 text-sm">
        <span className="rounded-md bg-violet-600/25 px-2.5 py-1 font-semibold">
          Основні
        </span>
        <Link
          href={`/command-deck/community-hub/sections/${forum.id}`}
          className="rounded-md px-2.5 py-1 text-slate-300 hover:text-white"
        >
          Доступ і права
        </Link>
        <Link
          href={`/command-deck/community-hub/sections/${forum.id}?tab=content`}
          className="rounded-md px-2.5 py-1 text-slate-300 hover:text-white"
        >
          Контент
        </Link>
        <Link
          href={`/command-deck/community-hub/sections/${forum.id}?tab=extra`}
          className="rounded-md px-2.5 py-1 text-slate-300 hover:text-white"
        >
          Додатково
        </Link>
      </div>
      <div className="space-y-3 text-sm">
        <LabeledInput
          label="Назва"
          value={forum.title}
          onChange={(title) => onChange({ title })}
        />
        <LabeledText
          label="Опис"
          max={300}
          value={forum.description ?? ""}
          onChange={(description) =>
            onChange({ description: description || null })
          }
        />
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_7rem]">
          <label className="space-y-1">
            <span className="text-xs text-slate-400">Батьківський розділ</span>
            <select
              className={field}
              value={parentValue}
              onChange={(event) => {
                const [kind, id] = event.target.value.split(":");
                if (kind === "category")
                  onChange({ categoryId: id, parentId: null });
                else {
                  const parent = forums.find((item) => item.id === id);
                  if (parent)
                    onChange({ categoryId: parent.categoryId, parentId: id });
                }
              }}
            >
              {categories.map((category) => (
                <optgroup key={category.id} label={category.title}>
                  <option value={`category:${category.id}`}>
                    {category.title}
                  </option>
                  {parents
                    .filter((item) => item.categoryId === category.id)
                    .map((item) => (
                      <option key={item.id} value={`forum:${item.id}`}>
                        {category.title} › {item.title}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </label>
          <LabeledNumber
            label="Порядок"
            value={forum.position}
            onChange={(position) => onChange({ position })}
          />
        </div>
        <div className="grid gap-x-6 sm:grid-cols-2">
          <Toggle
            label="Активний розділ"
            checked={forum.active}
            onChange={(active) => onChange({ active })}
          />
          <Toggle
            label="Дозволити опитування"
            checked={forum.allowPolls}
            onChange={(allowPolls) => onChange({ allowPolls })}
          />
          <Toggle
            label="Дозволити створення тем"
            checked={forum.allowTopics}
            onChange={(allowTopics) => onChange({ allowTopics })}
          />
          <Toggle
            label="Дозволити вкладення"
            checked={forum.allowAttachments}
            onChange={(allowAttachments) => onChange({ allowAttachments })}
          />
          <Toggle
            label="Дозволити відповіді"
            checked={forum.allowReplies}
            onChange={(allowReplies) => onChange({ allowReplies })}
          />
          <Toggle
            label="Показ у списку форумів"
            checked={forum.listed}
            onChange={(listed) => onChange({ listed })}
          />
        </div>
      </div>
    </Card>
  );
}

export function LabeledInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs text-slate-400">{label}</span>
      <input
        className={field}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export function LabeledNumber({
  label,
  value,
  onChange,
  min = 0,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs text-slate-400">{label}</span>
      <input
        type="number"
        min={min}
        className={field}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

export function LabeledText({
  label,
  value,
  onChange,
  max = 500,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  max?: number;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs text-slate-400">{label}</span>
      <textarea
        rows={3}
        maxLength={max}
        className={cn(field, "h-auto py-2")}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <span className="block text-right text-[11px] text-slate-500">
        {value.length} / {max}
      </span>
    </label>
  );
}

function AddSectionDialog({
  categories,
  forums,
  onClose,
  onCreated,
}: {
  categories: readonly CategoryDraft[];
  forums: readonly ForumDraft[];
  onClose: () => void;
  onCreated: (selection: Selection) => void;
}) {
  const [kind, setKind] = useState<"category" | "forum">("forum");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [parent, setParent] = useState(
    categories[0] ? `category:${categories[0].id}` : "",
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function create() {
    setError(null);
    start(async () => {
      if (kind === "category") {
        const result = await createForumCategory({
          slug,
          title,
          description: null,
          position: categories.length + 1,
          visibility: "PUBLIC",
          audienceKeys: [],
          active: false,
        });
        if (!result.ok) return setError(result.error.message);
        onCreated({ kind: "category", id: result.data });
        return;
      }
      const [parentKind, parentId] = parent.split(":");
      const parentForum = forums.find(({ id }) => id === parentId);
      const result = await createForum({
        categoryId:
          parentKind === "category" ? parentId : parentForum!.categoryId,
        parentId: parentKind === "forum" ? parentId : null,
        slug,
        title,
        description: null,
        position: 99,
        active: false,
        allowsGatedContent: false,
        allowTopics: true,
        allowReplies: true,
        allowPolls: true,
        allowAttachments: true,
        listed: true,
        searchable: true,
        showCounts: true,
        attachmentFormats: [],
        gateViewRole: "GUEST",
        gateCreateRole: "MEMBER",
        gateBlockTypes: ["TEXT", "CODE", "MEDIA", "FILES"],
      });
      if (!result.ok) return setError(result.error.message);
      onCreated({ kind: "forum", id: result.data });
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-section-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      <div className="w-full max-w-md space-y-4 rounded-xl border border-white/10 bg-card p-5">
        <div className="flex items-center">
          <h2 id="add-section-title" className="text-lg font-semibold">
            Додати розділ
          </h2>
          <button
            type="button"
            aria-label="Закрити"
            onClick={onClose}
            className="ml-auto text-slate-400 hover:text-white"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
        <div className="grid grid-cols-2 rounded-lg border border-white/10 p-0.5 text-sm">
          {(["forum", "category"] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={kind === value}
              onClick={() => setKind(value)}
              className={cn(
                "h-9 rounded-md",
                kind === value ? "bg-violet-600 text-white" : "text-slate-300",
              )}
            >
              {value === "forum" ? "Форум" : "Категорія"}
            </button>
          ))}
        </div>
        <LabeledInput label="Назва" value={title} onChange={setTitle} />
        <LabeledInput
          label="Slug (латиницею, для посилань)"
          value={slug}
          onChange={setSlug}
        />
        {kind === "forum" ? (
          <label className="block space-y-1 text-sm">
            <span className="text-xs text-slate-400">Де розмістити</span>
            <select
              className={field}
              value={parent}
              onChange={(event) => setParent(event.target.value)}
            >
              {categories.map((category) => (
                <optgroup key={category.id} label={category.title}>
                  <option value={`category:${category.id}`}>
                    {category.title}
                  </option>
                  {forums
                    .filter((item) => item.categoryId === category.id)
                    .map((item) => (
                      <option key={item.id} value={`forum:${item.id}`}>
                        {category.title} › {item.title} (підфорум)
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </label>
        ) : null}
        <p className="text-xs text-slate-500">
          Новий розділ створюється неактивним — увімкніть його, коли налаштуєте.
        </p>
        {error ? (
          <p role="alert" className="text-sm text-rose-300">
            {error}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-lg border border-white/15 px-4 text-sm"
          >
            Скасувати
          </button>
          <button
            type="button"
            onClick={create}
            disabled={pending || !title.trim() || !slug.trim()}
            className="h-10 rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            {pending ? "Створюємо…" : "Створити"}
          </button>
        </div>
      </div>
    </div>
  );
}
