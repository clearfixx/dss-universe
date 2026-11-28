// Writes the Command Deck routes of static pages and wires them; run from the repo root.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const read = (file) => readFileSync(file, "utf8").replace(/\r\n/g, "\n");
function edit(file, search, replace) {
  const source = read(file);
  if (!source.includes(search)) throw new Error(`${file}: ${search}`);
  writeFileSync(file, source.replace(search, () => replace));
}
const web = "apps/web/src";
const header = (path, purpose) => `/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Command Deck
 * 📄 File: ${path}
 *
 * 🎯 Purpose:
 * ${purpose}
 *
 * ⚠️ Important:
 * Admin area: 404 unless IAM grants Command Deck access; the API also
 * requires cms.pages.manage.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
`;
const base = `${web}/app/command-deck/pages`;
mkdirSync(`${base}/new`, { recursive: true });
mkdirSync(`${base}/[pageId]`, { recursive: true });
const frame = (last) => `    <CommandDeckFrame
      breadcrumbs={[
        { href: "/command-deck", label: "Command Deck" },
        { href: "/command-deck/pages", label: "Статичні сторінки" },
        { label: ${last} },
      ]}
    >`;

writeFileSync(`${base}/page.tsx`, header(`${base}/page.tsx`, "Command Deck › CMS Builder › Статичні сторінки.") + `import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CommandDeckFrame } from "@/components/command-deck/command-deck-frame";
import { loadAdminCommandDeckAccess } from "@/features/auth/admin-access";
import { loadStaticPages } from "@/features/command-deck/command-deck-data";
import { formatBanDate } from "@/features/ban/ban-contract";
import { pageStateLabel } from "@/features/static-pages/static-page-model";

export const metadata: Metadata = {
  title: "Статичні сторінки | Command Deck",
};

export default async function StaticPagesList() {
  if (!(await loadAdminCommandDeckAccess())) notFound();
  const pages = await loadStaticPages();

  return (
    <CommandDeckFrame
      breadcrumbs={[
        { href: "/command-deck", label: "Command Deck" },
        { label: "Статичні сторінки" },
      ]}
    >
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Статичні сторінки</h1>
        <Link
          href="/command-deck/pages/new"
          className="ml-auto rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500"
        >
          Нова сторінка
        </Link>
      </header>
      <p className="mt-1 mb-4 text-sm text-slate-400">
        Правила, контакти та інші сторінки без змін у коді.
      </p>
      {pages.length ? (
        <ul className="divide-y divide-white/[0.06] rounded-xl border border-white/[0.07] bg-card">
          {pages.map((page) => (
            <li key={page.id}>
              <Link
                href={\`/command-deck/pages/\${page.id}\`}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-white/[0.04]"
              >
                <span className="font-semibold">{page.title}</span>
                <span className="text-sm text-slate-400">/pages/{page.slug}</span>
                <span className="ml-auto text-xs text-slate-300">
                  {pageStateLabel(page)}
                </span>
                <span className="text-xs text-slate-500">
                  {formatBanDate(page.updatedAt)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-400">Сторінок ще немає.</p>
      )}
    </CommandDeckFrame>
  );
}
`);

writeFileSync(`${base}/new/page.tsx`, header(`${base}/new/page.tsx`, "Command Deck › Статичні сторінки › Нова сторінка.") + `import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CommandDeckFrame } from "@/components/command-deck/command-deck-frame";
import { loadAdminCommandDeckAccess } from "@/features/auth/admin-access";
import { StaticPageEditor } from "@/features/static-pages/static-page-editor";

export const metadata: Metadata = { title: "Нова сторінка | Command Deck" };

export default async function NewStaticPage() {
  if (!(await loadAdminCommandDeckAccess())) notFound();

  return (
${frame('"Нова сторінка"')}
      <StaticPageEditor page={null} />
    </CommandDeckFrame>
  );
}
`);

writeFileSync(`${base}/[pageId]/page.tsx`, header(`${base}/[pageId]/page.tsx`, "Command Deck › Статичні сторінки › редагування.") + `import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CommandDeckFrame } from "@/components/command-deck/command-deck-frame";
import { loadAdminCommandDeckAccess } from "@/features/auth/admin-access";
import { loadStaticPage } from "@/features/command-deck/command-deck-data";
import { StaticPageEditor } from "@/features/static-pages/static-page-editor";

export const metadata: Metadata = {
  title: "Редагування сторінки | Command Deck",
};

type Props = { params: Promise<{ pageId: string }> };

export default async function EditStaticPage({ params }: Props) {
  if (!(await loadAdminCommandDeckAccess())) notFound();
  const page = await loadStaticPage((await params).pageId);
  if (!page) notFound();

  return (
${frame("page.title")}
      <StaticPageEditor key={page.id} page={page} />
    </CommandDeckFrame>
  );
}
`);

const data = `${web}/features/command-deck/command-deck-data.ts`;
edit(data, "/** «Гарячі» settings and recent topics", `/** Static pages (cms.pages.manage). */
export async function loadStaticPages() {
  const result = await getClient().query({
    query: AdminStaticPagesDocument,
    context: await authContext(),
    fetchPolicy: "no-cache",
  });
  return result.data?.adminStaticPages ?? [];
}

/** Null when the page does not exist. */
export async function loadStaticPage(id: string) {
  try {
    const result = await getClient().query({
      query: AdminStaticPageDocument,
      variables: { id },
      context: await authContext(),
      fetchPolicy: "no-cache",
    });
    return result.data?.adminStaticPage ?? null;
  } catch (error) {
    if (toForumError(error).code === "NOT_FOUND") return null;
    throw error;
  }
}

/** «Гарячі» settings and recent topics`);
edit(data, "import {\n  AdminAccountBansDocument,\n", "import {\n  AdminAccountBansDocument,\n  AdminStaticPageDocument,\n  AdminStaticPagesDocument,\n");
edit(data, 'import { cookies } from "next/headers";\n', 'import { cookies } from "next/headers";\n\nimport { toForumError } from "@/features/forum/forum-errors";\n');
edit(`${web}/components/command-deck/command-deck-navigation.ts`, '      { label: "CMS Builder", icon: FileStack },', '      { label: "CMS Builder", icon: FileStack, href: "/command-deck/pages" },');
