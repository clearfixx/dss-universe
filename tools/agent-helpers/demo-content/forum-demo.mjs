#!/usr/bin/env node
/**
 * Forum demo dataset (API only).
 *
 * Fills a DSS Universe stack with recognisable "[demo]" forum content through
 * the public GraphQL API: a category, two sections, tags, topics of different
 * length, replies, a poll, an accepted answer, votes and subscriptions.
 *
 * Safety:
 * - Dry run by default. Nothing is written without --write.
 * - The endpoint is required (--api or DEMO_API_URL); there is no default.
 * - API only: no SQL, migrations, resets or deletes.
 * - Idempotent: every record has a deterministic slug/title and is looked up
 *   before it is created, so a re-run only fills gaps.
 * - Credentials come from env only and are never printed.
 *
 * Env:
 *   DEMO_ADMIN_EMAIL, DEMO_ADMIN_PASSWORD   account with forum admin rights
 *   DEMO_MEMBER_EMAIL, DEMO_MEMBER_PASSWORD second ordinary account
 *
 * Usage:
 *   node tools/agent-helpers/demo-content/forum-demo.mjs --api http://localhost:3101/api/graphql
 *   node tools/agent-helpers/demo-content/forum-demo.mjs --api http://localhost:3101/api/graphql --write
 */

const args = process.argv.slice(2);
const WRITE = args.includes("--write");
const apiArg = args.indexOf("--api");
const API = apiArg >= 0 ? args[apiArg + 1] : process.env.DEMO_API_URL;

if (!API || !/^https?:\/\//.test(API)) {
  fail("Set the GraphQL endpoint explicitly: --api <url> or DEMO_API_URL.");
}

const PREFIX = "[demo]";
const CATEGORY = {
  slug: "demo",
  title: `${PREFIX} Демо-спільнота`,
  description: "Демонстраційний контент для приймання UI. Створено скриптом forum-demo.",
  visibility: "PUBLIC",
  position: 90,
};
const FORUMS = [
  {
    key: "general",
    slug: "demo-general",
    title: `${PREFIX} Загальне обговорення`,
    description: "Обговорення, новини та ідеї.",
    tags: [
      { slug: "demo-ideas", label: "ідеї" },
      { slug: "demo-news", label: "новини" },
    ],
  },
  {
    key: "help",
    slug: "demo-help",
    title: `${PREFIX} Питання та допомога`,
    description: "Питання з прийнятими відповідями.",
    tags: [
      { slug: "demo-nextjs", label: "next.js" },
      { slug: "demo-backend", label: "backend" },
    ],
  },
];

const LONG_TEXT = [
  "Це довга демо-тема, щоб перевірити верстку великих дописів.",
  "Вона містить кілька абзаців тексту, щоб було видно інтервали, переноси і поведінку картки на мобільному.",
  "Третій абзац додає ще трохи обсягу. Lorem ipsum тут не використовується, щоб текст лишався українським.",
  "Останній абзац завершує тему і запрошує до обговорення.",
];

const TOPICS = [
  {
    forum: "general",
    title: `${PREFIX} Ласкаво просимо до спільноти`,
    kind: "DISCUSSION",
    author: "admin",
    body: ["Коротке привітання."],
    replies: [
      { author: "member", text: "Дякую, радий бути тут!" },
      { author: "admin", text: "Пишіть, якщо щось незрозуміло." },
    ],
    tags: ["demo-news"],
    subscribe: "member",
  },
  {
    forum: "general",
    title: `${PREFIX} Довга тема з кількома абзацами`,
    kind: "DISCUSSION",
    author: "member",
    body: LONG_TEXT,
    replies: Array.from({ length: 6 }, (_, i) => ({
      author: i % 2 ? "member" : "admin",
      text: `Відповідь №${i + 1} у довгій темі.`,
    })),
    tags: ["demo-ideas"],
    vote: { by: "admin", value: 1 },
  },
  {
    forum: "general",
    title: `${PREFIX} Опитування: який розділ додати наступним?`,
    kind: "DISCUSSION",
    author: "admin",
    body: ["Голосуйте в опитуванні нижче."],
    replies: [{ author: "member", text: "Проголосував за мобільний застосунок." }],
    tags: ["demo-ideas"],
    poll: {
      question: "Який розділ додати наступним?",
      options: ["Мобільний застосунок", "Геймдев", "Дизайн"],
    },
  },
  {
    forum: "help",
    title: `${PREFIX} Як налаштувати Turbopack у монорепозиторії?`,
    kind: "QUESTION",
    author: "member",
    body: ["Після оновлення dev-сервер бере застарілий кеш. Як це виправити?"],
    replies: [
      { author: "admin", text: "Видаліть .next/dev і .next/cache та перезапустіть dev-сервер.", accept: true },
      { author: "member", text: "Допомогло, дякую!" },
    ],
    tags: ["demo-nextjs"],
    vote: { by: "member", value: 1, reply: 0 },
  },
  {
    forum: "help",
    title: `${PREFIX} Питання без відповіді`,
    kind: "QUESTION",
    author: "member",
    body: ["Як правильно налаштувати черги в NestJS?"],
    replies: [],
    tags: ["demo-backend"],
  },
];

// ---------------------------------------------------------------- helpers

function fail(message) {
  console.error(`✖ ${message}`);
  process.exit(1);
}

function doc(profile, paragraphs) {
  return JSON.stringify({
    schemaVersion: 1,
    profile,
    content: {
      type: "doc",
      content: paragraphs.map((text) => ({
        type: "paragraph",
        content: [{ type: "text", text }],
      })),
    },
  });
}

/** Honours the API's post cooldown ("Please wait N seconds") by waiting. */
async function gql(token, query, variables = {}, attempt = 0) {
  try {
    return await gqlOnce(token, query, variables);
  } catch (error) {
    const wait = /wait (\d+) seconds/i.exec(String(error?.message))?.[1];
    if (!wait || attempt >= 3) throw error;
    console.log(`  … cooldown ${wait}s (API rate limit)`);
    await new Promise((resolve) => setTimeout(resolve, (Number(wait) + 2) * 1000));
    return gql(token, query, variables, attempt + 1);
  }
}

async function gqlOnce(token, query, variables) {
  const res = await fetch(API, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json().catch(() => ({}));
  if (json.errors?.length) {
    const first = json.errors[0];
    const code = first.extensions?.code ?? "ERROR";
    throw new Error(`${code}: ${first.message}`);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return json.data;
}

async function login(role) {
  const email = process.env[`DEMO_${role}_EMAIL`];
  const password = process.env[`DEMO_${role}_PASSWORD`];
  if (!email || !password) fail(`Set DEMO_${role}_EMAIL and DEMO_${role}_PASSWORD.`);
  const data = await gql(
    null,
    `mutation($input: LoginInput!) { login(input: $input) { tokens { accessToken } user { id } } }`,
    { input: { email, password } },
  );
  return { token: data.login.tokens.accessToken, id: data.login.user.id };
}

const stats = { created: 0, skipped: 0, planned: 0 };

/** Runs a write only with --write; otherwise counts it as planned. */
async function write(label, run) {
  if (!WRITE) {
    stats.planned++;
    console.log(`  · plan   ${label}`);
    return null;
  }
  const result = await run();
  stats.created++;
  console.log(`  + create ${label}`);
  return result;
}

function skip(label) {
  stats.skipped++;
  console.log(`  = exists ${label}`);
}

// ---------------------------------------------------------------- steps

async function ensureStructure(admin) {
  const { forumCategories } = await gql(
    admin.token,
    `{ forumCategories { id slug forums { id slug } } }`,
  );
  let category = forumCategories.find((c) => c.slug === CATEGORY.slug);
  if (category) skip(`category ${CATEGORY.slug}`);
  else {
    const created = await write(`category ${CATEGORY.slug}`, () =>
      gql(
        admin.token,
        `mutation($input: ForumCategoryInput!) { createForumCategory(input: $input) { id slug } }`,
        { input: CATEGORY },
      ),
    );
    category = created ? { ...created.createForumCategory, forums: [] } : null;
  }

  const forums = {};
  for (const [position, spec] of FORUMS.entries()) {
    let forum = category?.forums.find((f) => f.slug === spec.slug);
    if (forum) skip(`section ${spec.slug}`);
    else if (category) {
      const created = await write(`section ${spec.slug}`, () =>
        gql(
          admin.token,
          `mutation($input: ForumInput!) { createForum(input: $input) { id slug } }`,
          {
            input: {
              categoryId: category.id,
              slug: spec.slug,
              title: spec.title,
              description: spec.description,
              position,
            },
          },
        ),
      );
      forum = created?.createForum;
    } else {
      stats.planned++;
      console.log(`  · plan   section ${spec.slug}`);
    }
    forums[spec.key] = forum ? { ...forum, tags: await ensureTags(admin, forum, spec) } : null;
  }
  return forums;
}

async function ensureTags(admin, forum, spec) {
  const { forumTags } = await gql(
    admin.token,
    `query($forumId: ID!) { forumTags(forumId: $forumId) { id slug } }`,
    { forumId: forum.id },
  );
  const bySlug = Object.fromEntries(forumTags.map((t) => [t.slug, t.id]));
  for (const tag of spec.tags) {
    if (bySlug[tag.slug]) {
      skip(`tag ${tag.slug}`);
      continue;
    }
    const created = await write(`tag ${tag.slug}`, () =>
      gql(
        admin.token,
        `mutation($forumId: ID!, $input: ForumTagInput!) { createForumTag(forumId: $forumId, input: $input) { id } }`,
        { forumId: forum.id, input: tag },
      ),
    );
    if (created) bySlug[tag.slug] = created.createForumTag.id;
  }
  return bySlug;
}

async function findTopic(token, forumId, title) {
  for (let page = 1; page <= 10; page++) {
    const { forumTopics } = await gql(
      token,
      `query($forumId: ID!, $page: Int!) {
        forumTopics(forumId: $forumId, page: $page, limit: 50) {
          total items { id title postCount acceptedAnswerPostId interactionTargetId tags { slug } }
        }
      }`,
      { forumId, page },
    );
    const hit = forumTopics.items.find((t) => t.title === title);
    if (hit) return hit;
    if (page * 50 >= forumTopics.total) return null;
  }
  return null;
}

async function topicPosts(token, topicId) {
  const { forumPosts } = await gql(
    token,
    `query($topicId: ID!) { forumPosts(topicId: $topicId, limit: 100) { items { id number authorId viewerVote } } }`,
    { topicId },
  );
  return forumPosts.items;
}

async function ensureTopic(accounts, forums, spec) {
  const forum = forums[spec.forum];
  const label = `topic «${spec.title}»`;
  if (!forum) {
    stats.planned++;
    console.log(`  · plan   ${label} (+${spec.replies.length} replies)`);
    return;
  }
  const author = accounts[spec.author];
  let topic = await findTopic(author.token, forum.id, spec.title);
  if (topic) skip(label);
  else {
    const created = await write(label, () =>
      gql(
        author.token,
        `mutation($input: CreateForumTopicInput!) {
          createForumTopic(input: $input) { topic { id title postCount acceptedAnswerPostId interactionTargetId tags { slug } } }
        }`,
        {
          input: {
            forumId: forum.id,
            title: spec.title,
            kind: spec.kind,
            documentJson: doc("FORUM_TOPIC", spec.body),
          },
        },
      ),
    );
    topic = created?.createForumTopic.topic;
  }
  if (!topic) {
    stats.planned += spec.replies.length;
    return;
  }

  // Replies: posts after the first are matched by position.
  let posts = await topicPosts(author.token, topic.id);
  const existingReplies = Math.max(0, posts.length - 1);
  for (const [index, reply] of spec.replies.entries()) {
    const replyLabel = `  reply ${index + 1} in «${spec.title}»`;
    if (index < existingReplies) {
      skip(replyLabel);
      continue;
    }
    await write(replyLabel, () =>
      gql(
        accounts[reply.author].token,
        `mutation($input: CreateForumReplyInput!) { createForumReply(input: $input) { id } }`,
        {
          input: {
            topicId: topic.id,
            documentJson: doc("FORUM_REPLY", [reply.text]),
          },
        },
      ),
    );
  }
  posts = WRITE ? await topicPosts(author.token, topic.id) : posts;
  const replyPost = (i) => posts.find((p) => p.number === i + 2);

  // Tags.
  const wanted = spec.tags.filter((slug) => forum.tags[slug]);
  const current = new Set(topic.tags.map((t) => t.slug));
  if (wanted.every((slug) => current.has(slug))) skip(`  tags on «${spec.title}»`);
  else
    await write(`  tags on «${spec.title}»`, () =>
      gql(
        accounts.admin.token,
        `mutation($topicId: ID!, $tagIds: [ID!]!) { setForumTopicTags(topicId: $topicId, tagIds: $tagIds) { id } }`,
        { topicId: topic.id, tagIds: wanted.map((slug) => forum.tags[slug]) },
      ),
    );

  // Poll.
  if (spec.poll) {
    const { pollForTarget } = await gql(
      author.token,
      `query($id: ID!) { pollForTarget(interactionTargetId: $id) { id } }`,
      { id: topic.interactionTargetId },
    );
    if (pollForTarget) skip(`  poll on «${spec.title}»`);
    else
      await write(`  poll on «${spec.title}»`, () =>
        gql(
          author.token,
          `mutation($topicId: ID!, $input: ForumTopicPollInput!) { attachForumTopicPoll(topicId: $topicId, input: $input) { pollId } }`,
          { topicId: topic.id, input: spec.poll },
        ),
      );
  }

  // Accepted answer.
  const acceptIndex = spec.replies.findIndex((r) => r.accept);
  if (acceptIndex >= 0) {
    const post = replyPost(acceptIndex);
    if (topic.acceptedAnswerPostId) skip(`  accepted answer in «${spec.title}»`);
    else if (post)
      await write(`  accepted answer in «${spec.title}»`, () =>
        gql(
          author.token,
          `mutation($topicId: ID!, $postId: ID!) { acceptForumAnswer(topicId: $topicId, postId: $postId) { id } }`,
          { topicId: topic.id, postId: post.id },
        ),
      );
    else {
      stats.planned++;
      console.log(`  · plan   accepted answer in «${spec.title}»`);
    }
  }

  // Vote. Votes are final in the API, so check the voter's own vote first.
  if (spec.vote) {
    const target =
      spec.vote.reply === undefined
        ? posts.find((p) => p.number === 1)
        : replyPost(spec.vote.reply);
    const post = target
      ? (await topicPosts(accounts[spec.vote.by].token, topic.id)).find(
          (p) => p.id === target.id,
        )
      : null;
    if (post && post.viewerVote !== null && post.viewerVote !== undefined)
      skip(`  vote in «${spec.title}»`);
    else if (post)
      await write(`  vote ${spec.vote.value > 0 ? "+" : "−"}1 in «${spec.title}»`, () =>
        gql(
          accounts[spec.vote.by].token,
          `mutation($postId: ID!, $value: Int!) { voteForumPost(postId: $postId, value: $value) { ratingUp } }`,
          { postId: post.id, value: spec.vote.value },
        ),
      );
  }

  // Subscription.
  if (spec.subscribe) {
    const who = accounts[spec.subscribe];
    const { forumTopicSubscribed } = await gql(
      who.token,
      `query($topicId: ID!) { forumTopicSubscribed(topicId: $topicId) }`,
      { topicId: topic.id },
    );
    if (forumTopicSubscribed) skip(`  subscription to «${spec.title}»`);
    else
      await write(`  subscription to «${spec.title}»`, () =>
        gql(
          who.token,
          `mutation($topicId: ID!) { subscribeForumTopic(topicId: $topicId) }`,
          { topicId: topic.id },
        ),
      );
  }
}

// ---------------------------------------------------------------- main

console.log(`Forum demo dataset → ${API} (${WRITE ? "WRITE" : "dry run"})`);
const accounts = { admin: await login("ADMIN"), member: await login("MEMBER") };
if (accounts.admin.id === accounts.member.id) fail("Admin and member must be different accounts.");

try {
  const forums = await ensureStructure(accounts.admin);
  if (forums.general && WRITE)
    await gql(
      accounts.member.token,
      `mutation($forumId: ID!) { followForum(forumId: $forumId) }`,
      { forumId: forums.general.id },
    ).then(() => console.log(`  ~ follow section demo-general (member)`));
  for (const topic of TOPICS) await ensureTopic(accounts, forums, topic);
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}

console.log(
  `Done: ${stats.created} created, ${stats.skipped} already present, ${stats.planned} planned.` +
    (WRITE ? "" : " Re-run with --write to apply."),
);
