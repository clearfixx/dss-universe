/** Read-only installed stack inventory and registry audit; no installs/upgrades. */
import {
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
  existsSync,
} from "node:fs";
import { resolve, join } from "node:path";
import { homedir } from "node:os";
import { spawnSync } from "node:child_process";
import { randomUUID, createHash } from "node:crypto";
const root = resolve(import.meta.dirname, "../../..");
const json = (path) => JSON.parse(readFileSync(path, "utf8"));
const workspaces = [
  ".",
  ...["apps", "packages"].flatMap((dir) =>
    readdirSync(join(root, dir), { withFileTypes: true })
      .filter(
        (entry) =>
          entry.isDirectory() &&
          existsSync(join(root, dir, entry.name, "package.json")),
      )
      .map((entry) => `${dir}/${entry.name}`),
  ),
];
const records = workspaces.map((workspace) => {
  const manifest = json(join(root, workspace, "package.json"));
  const dependencies = Object.entries({
    ...manifest.dependencies,
    ...manifest.devDependencies,
  }).map(([name, declared]) => {
    const local = join(root, workspace, "node_modules", name, "package.json");
    const shared = join(root, "node_modules", name, "package.json");
    const path = existsSync(local) ? local : shared;
    if (!existsSync(path)) return { name, declared, installed: null };
    const pkg = json(path);
    return {
      name,
      declared,
      installed: pkg.version,
      engines: pkg.engines ?? {},
      peers: pkg.peerDependencies ?? {},
      deprecated: pkg.deprecated ?? null,
    };
  });
  return {
    workspace,
    name: manifest.name,
    engines: manifest.engines ?? {},
    dependencies,
  };
});
const output = join(root, "node_modules/.cache", `final-stack-${randomUUID()}`);
mkdirSync(output, { recursive: true });
const inventory = {
  date: new Date().toISOString(),
  node: process.version,
  lockSha256: createHash("sha256")
    .update(readFileSync(join(root, "pnpm-lock.yaml")))
    .digest("hex"),
  records,
};
writeFileSync(
  join(output, "inventory.json"),
  JSON.stringify(inventory, null, 2),
);
const pnpm = join(
  process.env.LOCALAPPDATA ?? join(homedir(), "AppData/Local"),
  "node/corepack/v1/pnpm/11.9.0/bin/pnpm.cjs",
);
const audit = spawnSync(process.execPath, [pnpm, "audit", "--json"], {
  cwd: root,
  encoding: "utf8",
  maxBuffer: 32 * 1024 * 1024,
  timeout: 120000,
});
if (audit.error) throw audit.error;
writeFileSync(join(output, "audit.json"), audit.stdout);
const report = JSON.parse(audit.stdout);
if (!report.metadata?.vulnerabilities || !report.advisories)
  throw new Error("Registry audit evidence missing.");
const advisories = Object.values(report.advisories).map((item) => ({
  id: item.github_advisory_id,
  module: item.module_name,
  severity: item.severity,
  installed: [...new Set(item.findings.map((finding) => finding.version))],
  title: item.title,
  patched: item.patched_versions,
  url: item.url,
  paths: [...new Set(item.findings.flatMap((finding) => finding.paths))],
}));
writeFileSync(
  join(output, "advisories.json"),
  JSON.stringify(advisories, null, 2),
);
console.log(
  JSON.stringify(
    {
      output,
      node: process.version,
      lockSha256: inventory.lockSha256,
      workspaces: records.length,
      unresolved: records.flatMap((record) =>
        record.dependencies.filter((dep) => dep.installed === null),
      ),
      auditExit: audit.status,
      vulnerabilities: report.metadata.vulnerabilities,
      advisoryCount: advisories.length,
      uniqueAdvisoryCount: new Set(advisories.map((item) => item.id)).size,
    },
    null,
    2,
  ),
);
