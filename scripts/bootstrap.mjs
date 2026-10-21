/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Developer Experience
 * 📄 File: scripts/bootstrap.mjs
 *
 * 🎯 Purpose:
 * Prepares a reproducible local environment on Windows, macOS and Linux.
 *
 * 🧠 Responsibilities:
 * • checks pinned runtimes and Docker;
 * • creates missing local environment files without replacing secrets;
 * • waits for services and applies committed migrations and seed.
 *
 * 🏗️ Architecture:
 * Development command orchestrator; application readiness is verified separately.
 *
 * ⚠️ Important:
 * Never resets databases or creates migrations automatically.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import { parseEnv } from "node:util";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(
  readFileSync(resolve(root, "package.json"), "utf8"),
);

function run(command, args, capture = false) {
  const windowsCorepack =
    process.platform === "win32" && command === "corepack";
  const result = spawnSync(
    windowsCorepack ? process.execPath : command,
    windowsCorepack
      ? [
          resolve(
            dirname(process.execPath),
            "node_modules/corepack/dist/corepack.js",
          ),
          ...args,
        ]
      : args,
    {
      cwd: root,
      stdio: capture ? "pipe" : "inherit",
      encoding: "utf8",
      shell: false,
    },
  );
  if (result.error || result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed (${result.status}).`);
  }
  return result.stdout?.trim();
}

try {
  if (process.versions.node !== manifest.engines.node) {
    throw new Error(
      `Use Node ${manifest.engines.node}; found ${process.versions.node}.`,
    );
  }
  const pnpm = run("corepack", ["pnpm", "--version"], true);
  if (pnpm !== manifest.engines.pnpm)
    throw new Error(`Use pnpm ${manifest.engines.pnpm}.`);
  console.log(`Node ${process.versions.node}; pnpm ${pnpm}`);
  run("docker", ["info", "--format", "{{.ServerVersion}}"]);
  for (const folder of ["", "apps/api", "apps/worker", "apps/web"]) {
    const target = resolve(root, folder, ".env");
    if (existsSync(target)) {
      console.log(
        `${folder || "root"}/.env preserved; review example for missing keys.`,
      );
      continue;
    }
    let template = readFileSync(resolve(root, folder, ".env.example"), "utf8");
    if (folder === "apps/api" || folder === "apps/worker") {
      const infrastructure = parseEnv(
        readFileSync(resolve(root, ".env"), "utf8"),
      );
      const database = new URL("postgresql://localhost");
      database.username = infrastructure.POSTGRES_USER;
      database.password = infrastructure.POSTGRES_PASSWORD;
      database.port = infrastructure.POSTGRES_PORT;
      database.pathname = infrastructure.POSTGRES_DB;
      database.search = "schema=public";
      template = template.replace(
        /^DATABASE_URL=.*$/m,
        `DATABASE_URL=${JSON.stringify(database.href)}`,
      );
      template = template.replace(
        /^REDIS_PORT=.*$/m,
        `REDIS_PORT=${infrastructure.REDIS_PORT}`,
      );
    }
    template = template.replace(
      /^(JWT_ACCESS_SECRET|JWT_REFRESH_SECRET|MEDIA_SIGNING_SECRET|AUTH_2FA_ENCRYPTION_KEY)=.*$/gm,
      (_, key) => `${key}=${randomBytes(32).toString("hex")}`,
    );
    writeFileSync(target, template, { flag: "wx", mode: 0o600 });
    console.log(`Created ${folder || "root"}/.env`);
  }
  const infrastructure = parseEnv(readFileSync(resolve(root, ".env"), "utf8"));
  for (const folder of ["apps/api", "apps/worker"]) {
    const local = resolve(root, folder, ".env.local");
    const env = {
      ...parseEnv(readFileSync(resolve(root, folder, ".env"), "utf8")),
      ...(folder === "apps/api" && existsSync(local)
        ? parseEnv(readFileSync(local, "utf8"))
        : {}),
      ...process.env,
    };
    const database = new URL(env.DATABASE_URL);
    if (
      !["postgresql:", "postgres:"].includes(database.protocol) ||
      !["localhost", "127.0.0.1"].includes(database.hostname) ||
      database.port !== infrastructure.POSTGRES_PORT ||
      decodeURIComponent(database.username) !== infrastructure.POSTGRES_USER ||
      decodeURIComponent(database.password) !==
        infrastructure.POSTGRES_PASSWORD ||
      decodeURIComponent(database.pathname.slice(1)) !==
        infrastructure.POSTGRES_DB ||
      (env.REDIS_HOST ?? "localhost") !== "localhost" ||
      env.REDIS_PORT !== infrastructure.REDIS_PORT
    ) {
      throw new Error(
        `${folder}: database/Redis configuration must match local Compose before bootstrap can migrate or seed.`,
      );
    }
  }
  run("corepack", ["pnpm", "install", "--frozen-lockfile"]);
  run("docker", ["compose", "up", "-d", "--wait", "--wait-timeout", "600"]);
  for (const task of ["db:generate", "api:db:deploy", "api:db:seed"]) {
    run("corepack", ["pnpm", task]);
  }
  console.log(
    "Infrastructure and database prepared. Run corepack pnpm dev, then check http://localhost:3001/api/health/ready.",
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
