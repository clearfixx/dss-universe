// Local preview only: uploads an image as the seeded test administrator and
// publishes a demo static page using it.
// Usage: node preview-static-page.mjs <local API base> <seed admin password> <image file>
import { readFileSync } from "node:fs";

const [base, adminPassword, image] = process.argv.slice(2);
if (!base || !/^https?:\/\/(localhost|127\.0\.0\.1):\d+\/api$/.test(base))
  throw new Error("Pass a local API base such as http://localhost:3101/api.");

async function gql(query, variables = {}, token) {
  const response = await fetch(`${base}/graphql`, {
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
const token = login.login.tokens.accessToken;
const bytes = readFileSync(image);
const { initiateMediaUpload } = await gql(
  `mutation I($input: InitiateMediaUploadInput!) { initiateMediaUpload(input: $input) { id } }`,
  {
    input: {
      policyKey: "content-image",
      originalFilename: "demo.webp",
      declaredMimeType: "image/webp",
      declaredSize: bytes.length,
    },
  },
  token,
);
const form = new FormData();
form.set("file", new Blob([bytes], { type: "image/webp" }), "demo.webp");
const upload = await fetch(
  `${base}/media/uploads/${initiateMediaUpload.id}/content`,
  { method: "PUT", headers: { authorization: `Bearer ${token}` }, body: form },
);
const session = await upload.json();
if (!upload.ok) throw new Error(JSON.stringify(session));
// The editor picks uploads from the library; do the same here.
const { mediaLibrary } = await gql(
  `{ mediaLibrary(input: { search: "demo.webp", first: 1 }) { items { id } } }`,
  {},
  token,
);
const mediaId = mediaLibrary.items[0]?.id;
if (!mediaId) throw new Error("The upload is not in the library.");

const paragraph = (text) => ({
  type: "paragraph",
  content: [{ type: "text", text }],
});
const heading = (text) => ({
  type: "heading",
  attrs: { level: 2 },
  content: [{ type: "text", text }],
});
const cell = (type, text) => ({ type, content: [paragraph(text)] });
const documentJson = JSON.stringify({
  schemaVersion: 1,
  profile: "ADMIN",
  content: {
    type: "doc",
    content: [
      { type: "tableOfContents" },
      heading("Як з нами зв'язатися"),
      paragraph("[demo] Напишіть нам: команда DSS Universe."),
      { type: "mediaReference", attrs: { mediaId, alt: "Станція", caption: "[demo] Наша станція" } },
      heading("Години роботи"),
      {
        type: "table",
        content: [
          { type: "tableRow", content: [cell("tableHeader", "День"), cell("tableHeader", "Час")] },
          { type: "tableRow", content: [cell("tableCell", "Понеділок"), cell("tableCell", "10:00–18:00")] },
        ],
      },
    ],
  },
});

// The worker scans and re-encodes the file before it can be attached.
let created;
for (let attempt = 0; attempt < 30 && !created; attempt += 1) {
  await new Promise((resolve) => setTimeout(resolve, 2000));
  try {
    created = (
      await gql(
        `mutation C($input: StaticPageInput!) { createStaticPage(input: $input) { id revision slug } }`,
        {
          input: {
            slug: `demo-zvyazok-${Date.now().toString(36)}`,
            title: "[demo] Зв'язок із командою",
            description: "[demo] Контакти та години роботи.",
            documentJson,
          },
        },
        token,
      )
    ).createStaticPage;
  } catch (error) {
    if (!String(error).includes("still processing")) throw error;
  }
}
if (!created) throw new Error("The image never became ready.");
await gql(
  `mutation P($id: ID!, $rev: Int!) { publishStaticPage(id: $id, expectedRevision: $rev) { id } }`,
  { id: created.id, rev: created.revision },
  token,
);
console.log(JSON.stringify({ slug: created.slug, mediaId }));
