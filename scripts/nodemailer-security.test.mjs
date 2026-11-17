import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";

const worker = createRequire(
  new URL("../apps/worker/package.json", import.meta.url),
);
const nodemailer = worker("nodemailer");

for (const [name, to] of [
  ["plain mailbox", "v@victim.invalid"],
  ["nested comment", "Victim (x(y) <evil@evil.invalid>) <v@victim.invalid>"],
  ["group comment", "G: (a; <evil@evil.invalid>) <v@victim.invalid>;"],
  [
    "quoted group display name",
    'G: "a;" "<evil@evil.invalid>" <v@victim.invalid>;',
  ],
]) {
  test(`mail envelope preserves intended recipient: ${name}`, async () => {
    const transport = nodemailer.createTransport({
      streamTransport: true,
      buffer: true,
    });
    const result = await transport.sendMail({
      from: "dss@sender.invalid",
      to,
      subject: "Synthetic recipient regression",
      text: "Synthetic content",
    });
    assert.deepEqual(result.envelope.to, ["v@victim.invalid"]);
    assert.ok(result.message.length > 0);
  });
}

test("Worker resolves supported patched Nodemailer 10", () => {
  const { version } = worker("nodemailer/package.json");
  assert.match(version, /^10\./);
  const [, minor] = version.split(".").map(Number);
  assert.ok(minor >= 6, "security maintenance floor is 10.6.0");
});
