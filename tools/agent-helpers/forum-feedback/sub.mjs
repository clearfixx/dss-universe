// Literal one-time replacement used by the wire-*.mjs helpers (CRLF-tolerant).
import { readFileSync, writeFileSync } from "node:fs";
export function sub(file, from, to) {
  const raw = readFileSync(file, "utf8");
  const crlf = raw.includes("\r\n");
  const source = raw.replace(/\r\n/g, "\n");
  if (!source.includes(from))
    throw new Error(`${file}: not found: ${from.slice(0, 70)}`);
  const next = source.replace(from, () => to);
  writeFileSync(file, crlf ? next.replace(/\n/g, "\r\n") : next);
}
