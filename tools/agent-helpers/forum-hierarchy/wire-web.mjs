import { readFileSync, writeFileSync } from "node:fs";
import { sub } from "../forum-feedback/sub.mjs";

const web = "apps/web/src";
const read = (file) => readFileSync(file, "utf8").replace(/\r\n/g, "\n");
const cut = (file, from, to, replacement) => {
  const text = read(file);
  const start = text.indexOf(from);
  const end = text.indexOf(to, start);
  if (start < 0 || end < 0)
    throw new Error(`${file}: markers not found: ${from}`);
  writeFileSync(file, text.slice(0, start) + replacement + text.slice(end));
};

// ---- query ----
const ops = `${web}/graphql/operations/forum.graphql`;
sub(
  ops,
  `  topicCount
  postCount
  lastActivity {`,
  `  topicCount
  postCount
  replyCount
  lastActivity {`,
);
sub(
  ops,
  `    position
    forums {
      id
      categoryId`,
  `    position
    moderators {
      ...ForumMemberCard
    }
    forums {
      id
      categoryId`,
);
sub(
  ops,
  `      allowsGatedContent
      activity {
        ...ForumActivityStatsFields
      }
      subforums {`,
  `      allowsGatedContent
      showCounts
      moderators {
        ...ForumMemberCard
      }
      activity {
        ...ForumActivityStatsFields
      }
      subforums {`,
);
sub(
  ops,
  `        allowsGatedContent
        activity {`,
  `        allowsGatedContent
        showCounts
        moderators {
          ...ForumMemberCard
        }
        activity {`,
);

// ---- hub ----
const hub = `${web}/app/community/(hub)/page.tsx`;
sub(
  hub,
  ` * counters, latest activity, questions that need help, the section browser
 * (category tabs) and, aside,`,
  ` * counters, latest activity, questions that need help, the section tree (one
 * foldable block per category, owner 2026-11-28) and, aside,`,
);
cut(hub, `type Activity = {`, `const TOPICS =`, "");
sub(
  hub,
  `const POSTS = ["допис", "дописи", "дописів"] as const;
const FORUMS = ["форум", "форуми", "форумів"] as const;
`,
  "",
);
cut(
  hub,
  `function SectionRow({`,
  `export default async function CommunityHubRoute`,
  "",
);
sub(
  hub,
  `  const tab = (active: boolean) =>
    \`relative inline-flex h-11 shrink-0 items-center px-3 text-sm transition \${
      active
        ? "font-semibold text-white after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-violet-500"
        : "text-slate-400 hover:text-white"
    }\`;`,
  `  const chip = (active: boolean) =>
    \`inline-flex h-9 shrink-0 items-center rounded-lg px-3 text-sm transition \${
      active
        ? "bg-violet-600 font-semibold text-white"
        : "bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white"
    }\`;`,
);
{
  const text = read(hub);
  const label = text.indexOf(`aria-label="Розділи форуму"`);
  const start = text.lastIndexOf("<section", label);
  const end = text.indexOf(
    `<div className="grid gap-4 lg:grid-cols-2">`,
    label,
  );
  const block = `<section aria-label="Розділи форуму" className="space-y-3">
              {categories.length > 1 ? (
                <nav
                  aria-label="Категорії"
                  className="flex gap-2 overflow-x-auto pb-1"
                >
                  <Link
                    href="/community"
                    aria-current={current ? undefined : "page"}
                    className={chip(!current)}
                  >
                    Усі категорії
                  </Link>
                  {categories.map((item) => (
                    <Link
                      key={item.id}
                      href={\`/community?category=\${item.id}\`}
                      aria-current={current?.id === item.id ? "page" : undefined}
                      className={chip(current?.id === item.id)}
                    >
                      {item.title}
                    </Link>
                  ))}
                </nav>
              ) : null}
              {categories.length === 0 ? (
                <p className="rounded-xl border border-white/[0.07] bg-card p-6 text-center text-sm text-slate-400">
                  Розділів поки немає.
                </p>
              ) : (
                (current ? [current] : categories).map((category) => (
                  <details
                    key={category.id}
                    open
                    className="group overflow-hidden rounded-xl border border-white/[0.07] bg-card"
                  >
                    <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 border-b border-violet-500/30 bg-violet-500/10 px-4 py-3">
                      <ChevronRight
                        className="size-4 text-violet-300 transition group-open:rotate-90"
                        aria-hidden="true"
                      />
                      <h2 className="font-semibold text-white">
                        {category.title}
                      </h2>
                      <span className="text-xs text-slate-400">категорія</span>
                      <ForumModeratorLine
                        members={category.moderators}
                        label="Модератори категорії"
                        className="w-full sm:ml-auto sm:w-auto"
                      />
                    </summary>
                    {category.forums.length ? (
                      <ForumSectionList sections={category.forums} />
                    ) : (
                      <p className="p-4 text-sm text-slate-400">
                        У цій категорії ще немає розділів.
                      </p>
                    )}
                  </details>
                ))
              )}
            </section>
            `;
  writeFileSync(hub, text.slice(0, start) + block + text.slice(end));
}
sub(
  hub,
  `        { href: "/community", label: "Спільнота" },
        { label: "Форум" },
      ]}`,
  `        { label: "Спільнота" },
      ]}`,
);
sub(
  hub,
  `import { ForumSectionIcon } from "@/features/forum/forum-section-icon";`,
  `import {
  ForumModeratorLine,
  ForumSectionList,
} from "@/features/forum/forum-section-list";`,
);

// ---- section page ----
const page = `${web}/app/community/forum/[forumId]/page.tsx`;
sub(
  page,
  ` * Forum section page after the owner mockup "Форум Next.js": header with
 * counters, section tabs,`,
  ` * Forum section page after the owner mockup "Форум Next.js": header with
 * counters and moderators, its subforums as their own block, section tabs,`,
);
sub(
  page,
  `        { href: "/community", label: "Форум" },
`,
  "",
);
sub(
  page,
  `            <dl className="flex gap-5">
              {(
                [
                  [MessageSquareText, activity.topicCount, TOPICS],
                  [FileText, activity.postCount, POSTS],
                  ...(facets
                    ? ([[Users, facets.participants, MEMBERS]] as const)
                    : []),
                ] as const
              ).map(`,
  `            <dl className="flex gap-5">
              {(forum.showCounts
                ? ([
                    [MessageSquareText, activity.topicCount, TOPICS],
                    [FileText, activity.replyCount, REPLIES],
                    ...(facets
                      ? ([[Users, facets.participants, MEMBERS]] as const)
                      : []),
                  ] as const)
                : []
              ).map(`,
);
sub(
  page,
  `const POSTS = ["допис", "дописи", "дописів"] as const;`,
  `const REPLIES = ["відповідь", "відповіді", "відповідей"] as const;`,
);
// parent link, sibling subforums and moderators above the title
sub(
  page,
  `          <header className="flex flex-wrap items-center gap-x-6 gap-y-3">`,
  `          {parent ? (
            <div className="space-y-2">
              <Link
                href={\`/community/forum/\${parent.id}\`}
                className="inline-flex items-center gap-1 text-sm text-violet-300 hover:text-violet-200"
              >
                <ChevronLeft className="size-4" aria-hidden="true" />
                Підфорум розділу «{parent.title}»
              </Link>
              {parent.subforums.length > 1 ? (
                <nav
                  aria-label="Підфоруми розділу"
                  className="flex gap-1.5 overflow-x-auto pb-1"
                >
                  {parent.subforums.map((item) => (
                    <Link
                      key={item.id}
                      href={\`/community/forum/\${item.id}\`}
                      aria-current={item.id === forum.id ? "page" : undefined}
                      className={\`shrink-0 rounded-md border px-2.5 py-1 text-xs \${
                        item.id === forum.id
                          ? "border-violet-500 bg-violet-600 text-white"
                          : "border-white/10 text-slate-300 hover:border-violet-400/50"
                      }\`}
                    >
                      {item.title}
                    </Link>
                  ))}
                </nav>
              ) : null}
            </div>
          ) : null}
          <header className="flex flex-wrap items-center gap-x-6 gap-y-3">`,
);
sub(
  page,
  `                    {forum.description}
                  </p>
                ) : null}
              </div>`,
  `                    {forum.description}
                  </p>
                ) : null}
                <ForumModeratorLine
                  members={forum.moderators}
                  className="mt-1.5"
                />
              </div>`,
);
// subforums move above the topics
cut(
  page,
  `          {subforums.length ? (
            <section
              id="subforums"`,
  `          {pinned.length ? (`,
  "",
);
{
  const text = read(page);
  const start = text.indexOf(`            {subforums.length ? (
              <a
                href="#subforums"`);
  const end = text.indexOf(
    `            <span className="ml-auto flex items-center pb-1.5 pl-3">`,
  );
  if (start < 0 || end < 0) throw new Error("subforum tab not found");
  writeFileSync(page, text.slice(0, start) + text.slice(end));
}
sub(
  page,
  `          <nav
            aria-label="Розділ"`,
  `          {subforums.length ? (
            <section
              aria-labelledby="subforums-title"
              className="overflow-hidden rounded-xl border border-white/[0.07] bg-card"
            >
              <h2
                id="subforums-title"
                className="border-b border-violet-500/30 bg-violet-500/10 px-4 py-2.5 font-semibold"
              >
                Підфоруми
              </h2>
              <ForumSectionList sections={subforums} />
            </section>
          ) : null}

          {subforums.length ? (
            <h2 className="pt-1 text-lg font-semibold">Теми розділу</h2>
          ) : null}

          <nav
            aria-label="Розділ"`,
);
sub(
  page,
  `const subforums = parent ? [] : "subforums" in forum ? forum.subforums : [];`,
  `const subforums = "subforums" in forum ? forum.subforums : [];`,
);
sub(
  page,
  `<h2 className="px-2 pt-2 pb-1 font-semibold">Схожі розділи</h2>`,
  `<h2 className="px-2 pt-2 pb-1 font-semibold">
                {parent ? "Інші підфоруми" : "Інші розділи категорії"}
              </h2>`,
);
sub(
  page,
  `import { ForumSectionIcon } from "@/features/forum/forum-section-icon";`,
  `import { ForumSectionIcon } from "@/features/forum/forum-section-icon";
import {
  ForumModeratorLine,
  ForumSectionList,
} from "@/features/forum/forum-section-list";`,
);

// ---- new topic ----
const fresh = `${web}/app/community/forum/new/page.tsx`;
sub(
  fresh,
  `        { href: "/community", label: "Форум" },
`,
  "",
);
sub(
  fresh,
  `              { href: \`/community/forum/\${chosen.id}\`, label: chosen.title },`,
  `              ...chosen.trail,`,
);
sub(
  fresh,
  `          title: item.title,
          category: category.title,
          categoryId: category.id,`,
  `          title: item.title,
          trail: [{ href: \`/community/forum/\${item.id}\`, label: item.title }],
          category: category.title,
          categoryId: category.id,`,
);
sub(
  fresh,
  `            title: \`\${item.title} › \${sub.title}\`,
`,
  `            title: \`\${item.title} › \${sub.title}\`,
            trail: [
              { href: \`/community/forum/\${item.id}\`, label: item.title },
              { href: \`/community/forum/\${sub.id}\`, label: sub.title },
            ],
`,
);
sub(
  fresh,
  `              sections={sections}`,
  `              sections={sections.map(({ trail: _trail, ...section }) => section)}`,
);

// ---- topic ----
const topic = `${web}/app/community/forum/topics/[topicId]/page.tsx`;
cut(
  topic,
  `  const forums = categories.flatMap(`,
  `  const path = topicPath(topic.id);`,
  `  const location = sectionPaths(categories).find(
    (item) => item.section.id === topic.forumId,
  );
  const forum = location
    ? { ...location.section, category: location.category.title }
    : undefined;

`,
);
sub(
  topic,
  `        { label: "Форум" },
        ...(forum
          ? [
              { label: forum.category },
              { href: \`/community/forum/\${forum.id}\`, label: forum.title },
            ]
          : []),`,
  `        ...(location
          ? [
              {
                href: \`/community?category=\${location.category.id}\`,
                label: location.category.title,
              },
              ...[location.parent, location.section].flatMap((item) =>
                item
                  ? [{ href: \`/community/forum/\${item.id}\`, label: item.title }]
                  : [],
              ),
            ]
          : []),`,
);
sub(
  topic,
  `} from "@/features/forum/forum-data";`,
  `} from "@/features/forum/forum-data";
import { sectionPaths } from "@/features/forum/forum-tree-model";`,
);
