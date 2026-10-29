/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Web Development Infrastructure
 * 📄 File: apps/web/scripts/dev.mjs
 * 🎯 Purpose: Supplies an optional isolated listener port before Next boots.
 * 🧠 Responsibilities: Preserves CLI/environment priority and normal Next dotenv loading.
 * 🏗️ Architecture: Thin CLI launcher; no UI or application policy.
 * ⚠️ Important: Never forward Node env-file flags into Next's restart NODE_OPTIONS.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseEnv } from "node:util";
import { createRequire } from "node:module";
import { spawn } from "node:child_process";

export function devEnvironment(directory, environment, args) {
  const result = { ...environment };
  if (
    environment.PORT !== undefined ||
    args.some(
      (arg) => arg === "-p" || arg === "--port" || arg.startsWith("--port="),
    )
  )
    return result;
  let contents;
  try {
    contents = readFileSync(resolve(directory, ".env.dev-port"), "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return result;
    throw error;
  }
  const port = parseEnv(contents).PORT;
  if (port === undefined) return result;
  if (!/^[1-9]\d{0,4}$/.test(port) || Number(port) > 65535)
    throw new Error("Invalid PORT in .env.dev-port (expected 1–65535)");
  return { ...result, PORT: port };
}

if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
  const args = process.argv.slice(2);
  const next = createRequire(import.meta.url).resolve("next/dist/bin/next");
  const child = spawn(process.execPath, [next, "dev", ...args], {
    stdio: "inherit",
    windowsHide: true,
    env: devEnvironment(process.cwd(), process.env, args),
  });
  for (const signal of ["SIGINT", "SIGTERM"])
    process.once(signal, () => child.kill(signal));
  child.once("error", () => {
    console.error("Unable to start Next development server");
    process.exitCode = 1;
  });
  child.once("exit", (code, signal) => {
    process.exitCode = code ?? (signal === "SIGINT" ? 130 : 1);
  });
}
