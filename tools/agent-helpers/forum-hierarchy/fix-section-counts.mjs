import { sub } from "../forum-feedback/sub.mjs";
const page = "apps/web/src/app/community/forum/[forumId]/page.tsx";
sub(page, `  const facets = state?.forumTopicFacets ?? null;`, `  // The counter switch also hides the numbers next to the filters.
  const facets = forum.showCounts ? (state?.forumTopicFacets ?? null) : null;
  // The same totals as the section's row on the hub: subforums included.
  const totals = sectionTotals(forum, subforums);`);
sub(page, `                    [MessageSquareText, activity.topicCount, TOPICS],
                    [FileText, activity.replyCount, REPLIES],`, `                    [MessageSquareText, totals.counts?.topics ?? 0, TOPICS],
                    [FileText, totals.counts?.replies ?? 0, REPLIES],`);
sub(page, `  const activity = forum.activity;
`, "");
sub(page, `import { forumCount, forumPlural } from "@/features/forum/forum-format";`, `import { forumCount, forumPlural } from "@/features/forum/forum-format";
import { sectionTotals } from "@/features/forum/forum-tree-model";`);
