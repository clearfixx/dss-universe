import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { createRequire } from 'node:module';
const root = process.cwd();
const ts = createRequire(resolve(root, 'apps/api/package.json'))('typescript');
const rows = [];
function walk(directory) {
  for (const item of readdirSync(directory, { withFileTypes: true })) {
    const path = resolve(directory, item.name);
    if (item.isDirectory()) walk(path);
    else if (item.name.endsWith('.ts') && !item.name.endsWith('.spec.ts')) {
      const source = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true);
      function visit(node) {
        if (ts.isCallExpression(node) && node.expression.getText(source) === 'createEventEnvelope') {
          const input = node.arguments[0];
          const property = (key) => ts.isObjectLiteralExpression(input) ? input.properties.find(p => p.name?.getText(source) === key)?.initializer?.getText(source) ?? '(spread/dynamic)' : '(dynamic input)';
          rows.push({ path: relative(root, path).replaceAll('\\','/'), line: source.getLineAndCharacterOfPosition(node.getStart()).line + 1, name: property('name'), producer: property('producer'), version: property('version') });
        }
        ts.forEachChild(node, visit);
      }
      visit(source);
    }
  }
}
walk(resolve(root,'apps/api/src'));
writeFileSync(resolve(root,'node_modules/.cache/c1-event-inventory.json'),JSON.stringify(rows,null,2));
console.log(JSON.stringify({callSites:rows.length,files:new Set(rows.map(r=>r.path)).size}));
for(const row of rows) console.log(`${row.path}:${row.line} ${row.name}`);
