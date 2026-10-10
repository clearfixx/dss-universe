/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Storage
 * 📄 File: packages/storage/src/normalize-storage-key.ts
 *
 * 🎯 Purpose:
 * Defines portable relative storage keys without filesystem side effects.
 *
 * 🧠 Responsibilities:
 * • canonicalizes separators;
 * • rejects traversal, absolute paths and Windows filesystem aliases.
 *
 * 🏗️ Architecture:
 * Shared infrastructure contract, independent of Media policy.
 *
 * ⚠️ Important:
 * Never decode URLs or silently remove invalid path segments here.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { posix, win32 } from "node:path";

const INVALID_KEY =
  "Storage key is invalid or escapes the configured uploads root.";
const INVALID_CHARACTERS = /[\u0000-\u001f\u007f<>:"|?*]/;
const RESERVED_DEVICE = /^(?:con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(?:\.|$)/i;

export function normalizeStorageKey(value: unknown): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(INVALID_KEY);
  }
  const key = value.replaceAll("\\", "/");
  if (
    posix.isAbsolute(key) ||
    win32.isAbsolute(key) ||
    INVALID_CHARACTERS.test(key)
  ) {
    throw new Error(INVALID_KEY);
  }
  for (const segment of key.split("/")) {
    if (
      !segment ||
      segment === "." ||
      segment === ".." ||
      /[. ]$/.test(segment) ||
      RESERVED_DEVICE.test(segment)
    ) {
      throw new Error(INVALID_KEY);
    }
  }
  return key;
}
