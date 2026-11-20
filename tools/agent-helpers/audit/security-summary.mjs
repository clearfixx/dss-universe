import { spawnSync } from "node:child_process";
const result = spawnSync(
  process.platform === "win32" ? "pnpm.cmd" : "pnpm",
  ["audit", "--json"],
  { encoding: "utf8", shell: process.platform === "win32" },
);
const audit = JSON.parse(result.stdout);
console.log(
  JSON.stringify(
    {
      counts: audit.metadata.vulnerabilities,
      findings: Object.values(audit.advisories).map((advisory) => {
        const paths = [
          ...new Set(advisory.findings.flatMap(({ paths }) => paths)),
        ];
        return {
          advisory: advisory.github_advisory_id,
          name: advisory.module_name,
          severity: advisory.severity,
          patched: advisory.patched_versions,
          pathCount: paths.length,
          samplePaths: paths.slice(0, 3),
        };
      }),
    },
    null,
    2,
  ),
);
