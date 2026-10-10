/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Storage
 * 📄 File: packages/storage/src/storage-key.spec.ts
 *
 * 🎯 Purpose:
 * Verifies the portable storage-key boundary on each host platform.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { normalizeStorageKey, resolveStorageKey } from "./index";

describe("portable storage keys", () => {
  it.each([
    undefined,
    null,
    1,
    {},
    "",
    ".",
    "..",
    "../escape",
    "..\\escape",
    "safe/../../escape",
    "safe\\..\\escape",
    "/etc/passwd",
    "\\rooted",
    "C:\\uploads\\file",
    "C:relative",
    "\\\\server\\share\\file",
    "\\\\?\\C:\\file",
    "safe//file",
    "safe/./file",
    "safe/",
    "file\0.txt",
    "file\n.txt",
    "file:stream",
    "file?",
    "file*",
    "<file>",
    "file|name",
    'file"name',
    "CON",
    "con.txt",
    "aux/file",
    "NUL.txt",
    "COM1.log",
    "lpt9",
    "COM¹.txt",
    "folder./file",
    "folder /file",
  ])("rejects invalid key %j", (key) => {
    expect(() => normalizeStorageKey(key)).toThrow("Storage key");
    expect(() => resolveStorageKey(resolve("uploads"), key)).toThrow(
      "Storage key",
    );
  });

  it.each([
    "temporary/owner/file.png",
    ".hidden/file",
    "дані/файл.webp",
    "%2e%2e/file",
  ])("preserves valid opaque key %s", (key) => {
    expect(normalizeStorageKey(key)).toBe(key);
    expect(resolveStorageKey(resolve("uploads"), key)).toBe(
      resolve("uploads", key),
    );
  });

  it("canonicalizes backslashes without accepting traversal", () => {
    expect(normalizeStorageKey("temporary\\owner\\file")).toBe(
      "temporary/owner/file",
    );
    expect(
      resolveStorageKey(resolve("uploads"), "temporary\\owner\\file"),
    ).toBe(resolve("uploads", "temporary", "owner", "file"));
  });

  it("rejects sibling-prefix traversal", () => {
    expect(() =>
      resolveStorageKey(resolve("uploads"), "../uploads-other/file"),
    ).toThrow("Storage key");
  });
});
