/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: D7 source verification
 * 📄 File: node_modules/.cache/d7-public-root-inventory.cjs
 * 🎯 Purpose:
 * Inventory literal feature root exports without treating types as providers.
 * 🧠 Responsibilities:
 * • reject parse failures and distinguish named/type-only exports;
 * • identify wildcard/namespace and application/infrastructure value re-exports;
 * • retain bounded source metadata, not a runtime-compliance certificate.
 * 🏗️ Architecture:
 * Ignored read-only AST audit helper, not a new enforcement rule or waiver.
 * ⚠️ Important:
 * Transitive and dynamic behavior need existing graph tests and runtime evidence.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
const { readdirSync, readFileSync, existsSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');
const { createRequire } = require('node:module');
const ts = createRequire(join(process.cwd(),'apps/api/package.json'))('typescript');
const base = 'apps/api/src/modules';
const report = {roots:0,declarations:0,typeOnlySymbols:0,valueSymbols:0,wildcardOrNamespace:[],implementationValues:[],parseFailures:[]};
for(const directory of readdirSync(base,{withFileTypes:true}).filter(entry=>entry.isDirectory())) {
 const file = join(base,directory.name,'index.ts');
 if(!existsSync(file)) continue;
 report.roots++;
 const source = ts.createSourceFile(file,readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true);
 if(source.parseDiagnostics.length) report.parseFailures.push(file);
 for(const declaration of source.statements.filter(ts.isExportDeclaration)) {
  report.declarations++;
  if(!declaration.exportClause || !ts.isNamedExports(declaration.exportClause)) {
   report.wildcardOrNamespace.push(file); continue;
  }
  const target = declaration.moduleSpecifier?.text ?? '';
  for(const element of declaration.exportClause.elements) {
   if(declaration.isTypeOnly || element.isTypeOnly) report.typeOnlySymbols++;
   else {
    report.valueSymbols++;
    if(/(?:^|\/)(?:application|infrastructure)(?:\/|(?:\.ts)?$)|\.(?:service|repository|mapper)(?:\.ts)?$/.test(target) || /(?:Service|Repository|Mapper)$/.test(element.name.text))
     report.implementationValues.push({file,target,name:element.name.text});
   }
  }
 }
}
writeFileSync('node_modules/.cache/d7-public-root-inventory.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
if(report.parseFailures.length || !report.roots) process.exitCode=1;
