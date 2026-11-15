/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: D7 documentation verification
 * 📄 File: node_modules/.cache/d7-current-links.cjs
 * 🎯 Purpose:
 * Check local Markdown file targets in the net D7 documentation diff.
 * 🧠 Responsibilities:
 * • check existence without following external URLs;
 * • keep anchors and remote validation outside the evidence claim;
 * • never modify documentation or target files.
 * 🏗️ Architecture:
 * Ignored read-only audit helper, not a release/compliance certificate.
 * ⚠️ Important:
 * File existence does not prove target correctness or anchor validity.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
const { readFileSync, existsSync, writeFileSync } = require('node:fs');
const { execFileSync } = require('node:child_process');
const { resolve, dirname } = require('node:path');
const files = execFileSync('git',['diff','--name-only','origin/main'],{encoding:'utf8'})
  .split(/\r?\n/).filter(file => file.endsWith('.md'));
const report = {files: files.length, checked: 0, externalOrAnchor: 0, missing: []};
for (const file of files) {
 for (const match of readFileSync(file,'utf8').matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
  const raw = match[1].trim().replace(/^<|>$/g,'').split(/\s+"/)[0];
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw) || raw.startsWith('#')) { report.externalOrAnchor++; continue; }
  const target = decodeURIComponent(raw.split('#')[0]);
  if (!target) continue;
  report.checked++;
  if (!existsSync(resolve(dirname(file),target))) report.missing.push({file,target});
 }
}
writeFileSync('node_modules/.cache/d7-current-links.json', JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
if (report.missing.length) process.exitCode = 1;
