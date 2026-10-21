/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Storage
 * 📄 File: packages/storage/src/resolve-storage-key.ts
 *
 * 🎯 Purpose:
 * Resolves validated storage keys beneath a trusted local uploads root.
 *
 * 🧠 Responsibilities:
 * • validates keys through the shared contract;
 * • enforces native-platform lexical containment.
 *
 * 🏗️ Architecture:
 * Pure path utility; no file IO or business policy.
 *
 * ⚠️ Important:
 * Lexical containment does not prevent symlink/junction races.
 * The storage root must be writable only by trusted application processes.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { isAbsolute, relative, resolve, sep } from "node:path";
import { normalizeStorageKey } from "./normalize-storage-key";

export function resolveStorageKey(root: string, key: unknown): string {
  const path = resolve(root, normalizeStorageKey(key));
  const remainder = relative(resolve(root), path);
  if (
    !remainder ||
    isAbsolute(remainder) ||
    remainder === ".." ||
    remainder.startsWith(`..${sep}`)
  ) {
    throw new Error("Storage key escapes the configured uploads root.");
  }
  return path;
}
