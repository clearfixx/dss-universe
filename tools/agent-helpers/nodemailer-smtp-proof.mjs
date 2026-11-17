import assert from "node:assert/strict";
import { createRequire } from "node:module";
const worker = createRequire(
  new URL("../../apps/worker/package.json", import.meta.url),
);
const mail = worker("nodemailer").createTransport({
  host: "127.0.0.1",
  port: 12526,
  secure: false,
});
await mail.verify();
const result = await mail.sendMail({
  from: "dss@sender.invalid",
  to: "Victim (x(y) <evil@evil.invalid>) <v@victim.invalid>",
  subject: "DSS synthetic security regression",
  text: "Synthetic fixture only",
});
assert.deepEqual(result.accepted, ["v@victim.invalid"]);
const response = await fetch("http://127.0.0.1:18026/api/v1/messages");
assert.equal(response.status, 200);
const messages = await response.json();
assert.equal(messages.total, 1);
assert.deepEqual(
  messages.messages[0].To.map(({ Address }) => Address),
  ["v@victim.invalid"],
);
console.log("Mailpit: SMTP verification and exact recipient delivery passed");
mail.close();
