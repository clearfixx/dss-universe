// Wires the administrator side of bans into the web app; run from the repo root.
import { readFileSync, writeFileSync } from "node:fs";

const read = (file) => readFileSync(file, "utf8").replace(/\r\n/g, "\n");
function edit(file, search, replace) {
  const source = read(file);
  if (!source.includes(search)) throw new Error(`${file}: ${search}`);
  writeFileSync(file, source.replace(search, () => replace));
}
const web = "apps/web/src";

const data = `${web}/features/command-deck/command-deck-data.ts`;
edit(
  data,
  "/** «Гарячі» settings and recent topics",
  `/** Appeals of permanent bans (moderation.bans.manage). */
export async function loadBanAppeals(status: BanAppealStatus, page: number) {
  const result = await getClient().query({
    query: AdminBanAppealsDocument,
    variables: { status, page },
    context: await authContext(),
    fetchPolicy: "no-cache",
  });
  return result.data?.banAppeals ?? { total: 0, items: [] };
}

export async function loadActiveBans(page: number) {
  const result = await getClient().query({
    query: AdminAccountBansDocument,
    variables: { page },
    context: await authContext(),
    fetchPolicy: "no-cache",
  });
  return result.data?.accountBans ?? { total: 0, items: [] };
}

/** «Гарячі» settings and recent topics`,
);
edit(data, "import {\n  AdminCommunityRulesDocument,\n", "import {\n  AdminAccountBansDocument,\n  AdminBanAppealsDocument,\n  AdminCommunityRulesDocument,\n  type BanAppealStatus,\n");

edit(
  `${web}/components/command-deck/command-deck-navigation.ts`,
  '        href: "/command-deck/moderation/rules",',
  '        href: "/command-deck/moderation/appeals",',
);
edit(
  `${web}/app/command-deck/moderation/rules/page.tsx`,
  "      <CommunityRulesManager rules={rules} />",
  '      <ModerationTabs active="rules" />\n      <CommunityRulesManager rules={rules} />',
);
edit(
  `${web}/app/command-deck/moderation/rules/page.tsx`,
  'import { CommunityRulesManager } from "@/features/command-deck/community-rules-manager";\n',
  'import { CommunityRulesManager } from "@/features/command-deck/community-rules-manager";\nimport { ModerationTabs } from "@/features/command-deck/moderation-tabs";\n',
);

// ---- Forum: who may ban comes from the API (null for everyone else).
const forumData = `${web}/features/forum/forum-data.ts`;
writeFileSync(
  forumData,
  `${read(forumData).trimEnd()}

/** Rules in force for those who may ban accounts; null for everyone else. */
export async function loadAccountBanRules() {
  try {
    const result = await getClient().query({
      query: AccountBanRulesDocument,
      context: await authContext(),
      fetchPolicy: "no-cache",
    });
    return result.data?.accountBanRules ?? null;
  } catch {
    return null;
  }
}
`,
);
edit(forumData, "import {\n", "import {\n  AccountBanRulesDocument,\n");

const bar = `${web}/features/forum/forum-post-action-bar.tsx`;
edit(bar, '  | "purge"\n  | "network";', '  | "purge"\n  | "ban"\n  | "network";');
edit(bar, "  path,\n  canReply,\n}: {", "  path,\n  canReply,\n  ban = null,\n}: {");
edit(
  bar,
  "  path: string;\n  canReply: boolean;\n}) {",
  `  path: string;
  canReply: boolean;
  /** Set when the viewer may ban this author permanently. */
  ban?: Readonly<{
    authorId: string;
    authorName: string;
    rules: ReadonlyArray<{ id: string; code: string; text: string }>;
  }> | null;
}) {`,
);
edit(
  bar,
  "  const hasMenu = canAccept || staffMenu || (abilities.purge && !purged);",
  "  const hasMenu =\n    canAccept || staffMenu || (abilities.purge && !purged) || ban !== null;",
);
edit(
  bar,
  "            {abilities.purge && !purged ? (\n",
  `            {ban ? (
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
`,
);
edit(
  bar,
  '      <ForumActionDialog\n        {...dialogProps("warn")}',
  `      {ban ? (
        <ForumActionDialog
          {...dialogProps("ban")}
          title={\`Перманентний бан: \${ban.authorName}\`}
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
                label: \`\${rule.code}. \${rule.text}\`.slice(0, 120),
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
        {...dialogProps("warn")}`,
);
edit(bar, '} from "./forum-actions";\n', '} from "./forum-actions";\nimport { banForumAuthor } from "@/features/command-deck/ban-admin-actions";\n');
edit(bar, "import {\n", "import {\n  Ban,\n");

const card = `${web}/features/forum/forum-post-card.tsx`;
edit(card, "  allowsGatedContent = false,\n}: {", "  allowsGatedContent = false,\n  banRules = null,\n}: {");
edit(
  card,
  "  allowsGatedContent?: boolean;\n",
  "  allowsGatedContent?: boolean;\n  /** Rules to ban for; null unless the viewer may ban accounts. */\n  banRules?: ReadonlyArray<{ id: string; code: string; text: string }> | null;\n",
);
edit(
  card,
  "            canReply={canReply}\n          />",
  `            canReply={canReply}
            ban={
              banRules && post.author && post.author.id !== viewerId
                ? {
                    authorId: post.author.id,
                    authorName: forumMemberName(post.author),
                    rules: banRules,
                  }
                : null
            }
          />`,
);

const page = `${web}/app/community/forum/topics/[topicId]/page.tsx`;
edit(
  page,
  "  const abilities = topic.viewerAbilities;\n",
  "  const abilities = topic.viewerAbilities;\n  // Only staff ask; the API answers administrators and refuses the rest.\n  const banRules = abilities.moderate ? await loadAccountBanRules() : null;\n",
);
edit(
  page,
  "                allowsGatedContent={forum?.allowsGatedContent ?? false}\n",
  "                allowsGatedContent={forum?.allowsGatedContent ?? false}\n                banRules={banRules}\n",
);
edit(page, "  loadForumCategories,\n", "  loadAccountBanRules,\n  loadForumCategories,\n");
