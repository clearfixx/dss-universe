/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Agent Helper Preservation
 * 📄 File: tools/agent-helpers/verify-archive.mjs
 *
 * 🎯 Purpose:
 * Proves that archived helper sources retain their original bytes.
 *
 * 🧠 Responsibilities:
 * • validates bounded, unique manifest paths and regular files;
 * • checks byte lengths, SHA-256 and complete archive membership.
 *
 * 🏗️ Architecture:
 * Read-only integrity verification; never imports or executes archived code.
 *
 * ⚠️ Important:
 * Historical files are intentionally not reformatted or rewritten.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { lstatSync, readFileSync, readdirSync } from "node:fs";
import { resolve, sep, relative } from "node:path";
import { fileURLToPath } from "node:url";

const directory = fileURLToPath(new URL(".", import.meta.url));
const args = process.argv.slice(2);
assert.ok(args.length === 0 || (args.length === 1 && args[0] === "--staged"));
const staged = args[0] === "--staged";
const archive = resolve(directory, "archive");
const manifest = JSON.parse(
  readFileSync(new URL("archive-manifest.json", import.meta.url), "utf8"),
);
assert.equal(manifest.version, 1);
assert.ok(Array.isArray(manifest.entries) && manifest.entries.length > 0);
const expected = new Set();
let bytes = 0;
for (const entry of manifest.entries) {
  assert.match(entry.source, /^[a-z0-9-]+$/);
  assert.equal(entry.archivePath, `archive/${entry.source}/${entry.path}`);
  assert.ok(
    !entry.path.includes("\\") &&
      entry.path
        .split("/")
        .every((part) => part && part !== "." && part !== ".."),
  );
  const path = resolve(directory, entry.archivePath);
  assert.ok(path.startsWith(archive + sep), "Archive path escaped its root");
  assert.ok(!expected.has(path), "Duplicate manifest path");
  expected.add(path);
  const info = lstatSync(path);
  assert.ok(info.isFile() && !info.isSymbolicLink());
  const contents = readFileSync(path);
  assert.equal(contents.length, entry.bytes, entry.archivePath);
  assert.equal(
    createHash("sha256").update(contents).digest("hex"),
    entry.sha256,
    entry.archivePath,
  );
  bytes += contents.length;
  if (staged) {
    const indexed = execFileSync(
      "git",
      ["show", `:tools/agent-helpers/${entry.archivePath}`],
      {
        cwd: fileURLToPath(new URL("../../", import.meta.url)),
        maxBuffer: 1024 * 1024,
        windowsHide: true,
      },
    );
    assert.equal(
      createHash("sha256").update(indexed).digest("hex"),
      entry.sha256,
      `Git index: ${entry.archivePath}`,
    );
  }
}
function walk(path) {
  const info = lstatSync(path);
  assert.ok(!info.isSymbolicLink(), "Archive contains a symlink/junction");
  if (info.isDirectory())
    return readdirSync(path).flatMap((name) => walk(resolve(path, name)));
  assert.ok(info.isFile());
  return [path];
}
const actual = walk(archive);
assert.equal(actual.length, expected.size);
for (const path of actual)
  assert.ok(
    expected.has(path),
    `Unmanifested archive file: ${relative(directory, path)}`,
  );
console.log(
  `Verified ${expected.size} archived helpers (${bytes} bytes), exact SHA-256 matches; no archived code executed.`,
);
