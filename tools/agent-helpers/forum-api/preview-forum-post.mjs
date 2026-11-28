// Local preview only: one demo section and a topic by a throwaway member, so
// post actions can be checked by hand.
// Usage: node preview-forum-post.mjs <local GraphQL URL> <seed admin password>
const [api, adminPassword] = process.argv.slice(2);
if (!api || !/^https?:\/\/(localhost|127\.0\.0\.1)[:/]/.test(api))
  throw new Error("Pass a local GraphQL URL.");

async function gql(query, variables = {}, token) {
  const response = await fetch(api, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  });
  const body = await response.json();
  if (body.errors) throw new Error(JSON.stringify(body.errors));
  return body.data;
}

const login = await gql(
  `mutation L($input: LoginInput!) { login(input: $input) { tokens { accessToken } } }`,
  { input: { email: "admin@dss.local", password: adminPassword } },
);
const admin = login.login.tokens.accessToken;
const suffix = Date.now().toString(36);
const member = await gql(
  `mutation R($input: RegisterInput!) { register(input: $input) { tokens { accessToken } } }`,
  {
    input: {
      email: `post-preview-${suffix}@dss.test`,
      username: `post_preview_${suffix}`,
      displayName: "Post Preview",
      password: adminPassword,
    },
  },
);
const { createForumCategory } = await gql(
  `mutation C($input: ForumCategoryInput!) { createForumCategory(input: $input) { id } }`,
  {
    input: {
      slug: `demo-${suffix}`,
      title: "[demo] Перевірка",
      description: null,
      position: 0,
      visibility: "PUBLIC",
      audienceKeys: [],
      active: true,
    },
  },
  admin,
);
const { createForum } = await gql(
  `mutation F($input: ForumInput!) { createForum(input: $input) { id } }`,
  {
    input: {
      categoryId: createForumCategory.id,
      parentId: null,
      slug: `demo-section-${suffix}`,
      title: "[demo] Розділ",
      description: null,
      position: 0,
      allowsGatedContent: false,
      active: true,
    },
  },
  admin,
);
const documentJson = JSON.stringify({
  schemaVersion: 1,
  profile: "FORUM_TOPIC",
  content: {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: "[demo] Допис для перевірки." }],
      },
    ],
  },
});
const { createForumTopic } = await gql(
  `mutation T($input: CreateForumTopicInput!) { createForumTopic(input: $input) { topic { id } } }`,
  {
    input: {
      forumId: createForum.id,
      kind: "DISCUSSION",
      title: "[demo] Тема для перевірки бану",
      documentJson,
    },
  },
  member.register.tokens.accessToken,
);
console.log(createForumTopic.topic.id);
