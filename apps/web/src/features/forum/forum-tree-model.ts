/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Forum
 * 📄 File: apps/web/src/features/forum/forum-tree-model.ts
 *
 * 🎯 Purpose:
 * Pure rules of the section tree: what a section row counts and how the way
 * to a section is named (category → section → subforum).
 *
 * ⚠️ Important:
 * A section with the counter switch off shows no counters, and its numbers
 * never reach the totals of its parent.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

type Latest = { lastPostAt: unknown };

export type SectionActivity<L extends Latest> = {
  topicCount: number;
  replyCount: number;
  lastActivity?: L | null;
};

type Counted<L extends Latest> = {
  showCounts: boolean;
  activity: SectionActivity<L>;
};

const time = (value: unknown) => new Date(String(value)).getTime();

/** Totals of a section row: the section itself plus its subforums. */
export function sectionTotals<L extends Latest>(
  section: Counted<L>,
  subforums: ReadonlyArray<Counted<L>> = [],
): { counts: { topics: number; replies: number } | null; latest: L | null } {
  const all = [section, ...subforums];
  const latest = all.reduce<L | null>((best, item) => {
    const next = item.activity.lastActivity;
    if (!next) return best;
    return !best || time(next.lastPostAt) > time(best.lastPostAt) ? next : best;
  }, null);
  if (!section.showCounts) return { counts: null, latest };
  const counted = all.filter((item) => item.showCounts);
  return {
    counts: {
      topics: counted.reduce((sum, item) => sum + item.activity.topicCount, 0),
      replies: counted.reduce((sum, item) => sum + item.activity.replyCount, 0),
    },
    latest,
  };
}

type Titled = { id: string; title: string };
type TreeCategory = Titled & {
  forums: ReadonlyArray<Titled & { subforums: ReadonlyArray<Titled> }>;
};
type ForumOf<C extends TreeCategory> = C["forums"][number];
type SectionOf<C extends TreeCategory> =
  | ForumOf<C>
  | ForumOf<C>["subforums"][number];

/** Every section with the full way to it, in the order of the tree. */
export function sectionPaths<C extends TreeCategory>(
  categories: readonly C[],
): Array<{
  section: SectionOf<C>;
  category: C;
  parent: ForumOf<C> | null;
  path: string;
}> {
  return categories.flatMap((category) =>
    category.forums.flatMap((forum: ForumOf<C>) => [
      {
        section: forum as SectionOf<C>,
        category,
        parent: null as ForumOf<C> | null,
        path: `${category.title} › ${forum.title}`,
      },
      ...forum.subforums.map((sub) => ({
        section: sub as SectionOf<C>,
        category,
        parent: forum as ForumOf<C> | null,
        path: `${category.title} › ${forum.title} › ${sub.title}`,
      })),
    ]),
  );
}
