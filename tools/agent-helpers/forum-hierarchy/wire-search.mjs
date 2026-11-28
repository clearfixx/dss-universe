import { sub } from "../forum-feedback/sub.mjs";

const api = "apps/api/src";
sub(
  `${api}/modules/forum/contracts/forum-search-source.contract.ts`,
  `  publishedAt: Date;
}>;`,
  `  publishedAt: Date;
  /** Forum of the topic, so the client can show the way to it. */
  sectionId?: string;
}>;`,
);
const search = `${api}/modules/forum/infrastructure/prisma-forum-search.ts`;
sub(
  search,
  `  id: string;
  title: string;
  createdAt: Date;`,
  `  id: string;
  forumId: string;
  title: string;
  createdAt: Date;`,
);
sub(
  search,
  `SELECT t."id", t."title", t."createdAt",`,
  `SELECT t."id", t."forumId", t."title", t."createdAt",`,
);
sub(
  search,
  `      publishedAt: row.createdAt,
    }));`,
  `      publishedAt: row.createdAt,
      sectionId: row.forumId,
    }));`,
);
sub(
  `${api}/composition/news-delivery/shared-search.resolver.ts`,
  `  @Field() publishedAt!: Date;
}`,
  `  @Field() publishedAt!: Date;
  @Field(() => ID, { nullable: true, description: 'Forum of a topic hit.' })
  sectionId?: string;
}`,
);

const web = "apps/web/src";
sub(
  `${web}/graphql/operations/community-search.graphql`,
  `      publishedAt
    }
  }
  news:`,
  `      publishedAt
      sectionId
    }
  }
  news:`,
);
const page = `${web}/app/community/search/page.tsx`;
sub(
  page,
  `  const pages = list
    ?`,
  `  const sectionWay = new Map(
    sectionPaths(data ? await loadForumCategories() : []).map((item) => [
      item.section.id,
      item.path,
    ]),
  );
  const pages = list
    ?`,
);
sub(
  page,
  `                          {tab === "topics" ? "Форум" : "Новини"} ·{" "}`,
  `                          {tab === "topics"
                            ? (("sectionId" in item &&
                                sectionWay.get(item.sectionId ?? "")) ||
                              "Форум")
                            : "Новини"}{" "}
                          ·{" "}`,
);
sub(
  page,
  `export default async function CommunitySearchRoute`,
  `export default async function CommunitySearchRoute`,
);
const lines = `import { sectionPaths } from "@/features/forum/forum-tree-model";
import { loadForumCategories } from "@/features/forum/forum-data";
`;
sub(page, `const SOON_TABS`, `const SOON_TABS`);
import { readFileSync, writeFileSync } from "node:fs";
const text = readFileSync(page, "utf8").replace(/\r\n/g, "\n");
const at = text.indexOf("\ntype Props");
writeFileSync(page, text.slice(0, at) + lines + text.slice(at));
