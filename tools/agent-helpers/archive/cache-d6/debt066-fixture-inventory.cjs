/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: DEBT-066 compatibility research
 * 📄 File: node_modules/.cache/debt066-fixture-inventory.cjs
 * 🎯 Purpose:
 * Inventory statically resolvable tracked test documents without executing tests.
 * 🧠 Responsibilities:
 * • evaluate only literal AST syntax, never arbitrary fixture code;
 * • distinguish valid, deliberately invalid and unresolved documents;
 * • emit aggregate metadata without document text.
 * 🏗️ Architecture:
 * Ignored read-only source inventory using the current Editor build.
 * ⚠️ Important:
 * Dynamic fixtures and non-public database schemas are not certified.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
const { createRequire } = require('node:module');
const { readFileSync, writeFileSync } = require('node:fs');
const { execFileSync } = require('node:child_process');
const { join } = require('node:path');
const root = process.cwd();
const editor = createRequire(join(root, 'packages/editor/package.json'));
const ts = editor('typescript');
const { validateEditorDocument } = require(join(root, 'packages/editor/dist/index.js'));
function literal(node) {
 if (ts.isAsExpression(node) || ts.isSatisfiesExpression(node) || ts.isParenthesizedExpression(node)) return literal(node.expression);
 if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
 if (ts.isNumericLiteral(node)) return Number(node.text);
 if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
 if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
 if (node.kind === ts.SyntaxKind.NullKeyword) return null;
 if (ts.isIdentifier(node) && node.text === 'undefined') return undefined;
 if (ts.isArrayLiteralExpression(node)) return node.elements.map(literal);
 if (ts.isObjectLiteralExpression(node)) {
  const result = Object.create(null);
  for (const property of node.properties) {
   if (!ts.isPropertyAssignment(property) || property.name.kind === ts.SyntaxKind.ComputedPropertyName) throw new Error('dynamic');
   result[property.name.text] = literal(property.initializer);
  }
  return result;
 }
 throw new Error('dynamic');
}
function depth(rootNode) {
 const stack = [[rootNode, 0]]; let maximum = 0;
 while (stack.length) {
  const [node, level] = stack.pop(); maximum = Math.max(maximum, level);
  if (node && Array.isArray(node.content)) for (const child of node.content) stack.push([child, level + 1]);
 }
 return maximum;
}
const files = execFileSync('git', ['ls-files','-z','--','packages','apps'], {encoding:'utf8'}).split('\0')
 .filter(file => /\.(?:ts|tsx)$/.test(file) && /(?:\.spec\.|\.test\.|\/test\/|\/fixtures?\/)/.test(file));
const report = {filesScanned:files.length,candidates:0,valid:0,invalid:0,validatorThrows:0,unresolved:0,maxValidDepth:null,validProfiles:{},unresolvedFiles:[]};
for (const file of files) {
 const source = ts.createSourceFile(file, readFileSync(join(root,file),'utf8'), ts.ScriptTarget.Latest, true);
 const visit = node => {
  if (ts.isObjectLiteralExpression(node)) {
   const names = node.properties.filter(ts.isPropertyAssignment).map(property => property.name.text);
   if (['schemaVersion','profile','content'].every(key => names.includes(key))) {
    report.candidates++;
    let document;
    try { document = literal(node); } catch { report.unresolved++; report.unresolvedFiles.push(file); }
    if (document) {
     try {
      if (validateEditorDocument(document).valid) {
       report.valid++; report.maxValidDepth = Math.max(report.maxValidDepth ?? 0, depth(document.content));
       report.validProfiles[document.profile] = (report.validProfiles[document.profile] ?? 0) + 1;
      } else report.invalid++;
     } catch { report.validatorThrows++; }
    }
   }
  }
  ts.forEachChild(node,visit);
 };
 visit(source);
}
report.unresolvedFiles = [...new Set(report.unresolvedFiles)].sort();
writeFileSync('node_modules/.cache/debt066-fixture-inventory.json', JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
