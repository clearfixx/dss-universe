import { readFileSync, writeFileSync } from "node:fs";
const model = "apps/web/src/features/forum/forum-tree-model.ts";
const text = readFileSync(model, "utf8").replace(/\r\n/g, "\n");
writeFileSync(
  model,
  text.slice(0, text.indexOf("type Titled =")) +
    `type Titled = { id: string; title: string };
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
        path: \`\${category.title} › \${forum.title}\`,
      },
      ...forum.subforums.map((sub) => ({
        section: sub as SectionOf<C>,
        category,
        parent: forum as ForumOf<C> | null,
        path: \`\${category.title} › \${forum.title} › \${sub.title}\`,
      })),
    ]),
  );
}
`,
);
