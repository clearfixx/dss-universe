// Local preview only: registers a throwaway member and bans it with the seeded
// test administrator, so the ban screen can be checked by hand.
// Usage: node preview-ban-member.mjs <local GraphQL URL> <seed admin password>
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

const admin = await gql(
  `mutation L($input: LoginInput!) { login(input: $input) { tokens { accessToken } } }`,
  { input: { email: "admin@dss.local", password: adminPassword } },
);
const token = admin.login.tokens.accessToken;
const suffix = Date.now().toString(36);
const email = `ban-preview-${suffix}@dss.test`;
const member = await gql(
  `mutation R($input: RegisterInput!) { register(input: $input) { user { id } } }`,
  {
    input: {
      email,
      username: `ban_preview_${suffix}`,
      displayName: "Ban Preview",
      password: adminPassword,
    },
  },
);
const { communityRules } = await gql(
  "{ communityRules { id code active } }",
  {},
  token,
);
const rule = communityRules.find((item) => item.active);
const { issueAccountBan } = await gql(
  `mutation B($input: IssueAccountBanInput!) { issueAccountBan(input: $input) { reference } }`,
  {
    input: {
      subjectId: member.register.user.id,
      ruleId: rule.id,
      comment: "[demo] Перевірка екрана бану.",
      context: {
        type: "forum.post",
        id: "demo",
        path: "/community/forum/topics/demo#post-1",
      },
    },
  },
  token,
);
console.log(JSON.stringify({ email, reference: issueAccountBan.reference }));
