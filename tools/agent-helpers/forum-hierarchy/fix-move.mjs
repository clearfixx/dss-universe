import { sub } from "../forum-feedback/sub.mjs";
sub(
  "apps/web/src/app/community/forum/topics/[topicId]/page.tsx",
  `            forums={forums.map((item) => ({
              id: item.id,
              title: item.title,
              category: item.category,
            }))}`,
  `            forums={sectionPaths(categories).map((item) => ({
              id: item.section.id,
              title: item.parent
                ? \`\${item.parent.title} › \${item.section.title}\`
                : item.section.title,
              category: item.category.title,
            }))}`,
);
