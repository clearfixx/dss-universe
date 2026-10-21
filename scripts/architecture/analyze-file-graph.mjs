/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Architecture Tooling
 * 📄 File: scripts/architecture/analyze-file-graph.mjs
 *
 * 🎯 Purpose:
 * Detects static local API file cycles beyond feature-module boundaries.
 *
 * 🧠 Responsibilities:
 * • resolves literal dependencies using TypeScript and supplied compiler options;
 * • reports unresolved local edges and deterministic cyclic file groups.
 *
 * 🏗️ Architecture:
 * Pure analyzer over supplied source files and a virtual resolution host.
 *
 * ⚠️ Important:
 * Includes type-only edges; static cycles do not prove runtime DI failures.
 * External packages and non-API workspace aliases are outside this graph.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { createRequire } from "node:module";
import { resolve, posix } from "node:path";
import { findDependencyCycles } from "./find-dependency-cycles.mjs";

const requireApi = createRequire(
  new URL("../../apps/api/package.json", import.meta.url),
);
const {
  parseConfigFileTextToJson,
  flattenDiagnosticMessageText,
  convertCompilerOptionsFromJson,
  createModuleResolutionCache,
  createSourceFile,
  ScriptTarget,
  resolveModuleName,
  isImportDeclaration,
  isExportDeclaration,
  isStringLiteral,
  isImportTypeNode,
  isLiteralTypeNode,
  isImportEqualsDeclaration,
  isExternalModuleReference,
  isCallExpression,
  SyntaxKind,
  isIdentifier,
  forEachChild,
} = requireApi("typescript");

export function parseGraphCompilerOptions(source, configDirectory) {
  const parsed = parseConfigFileTextToJson("tsconfig.json", source);
  if (parsed.error)
    throw new Error(
      flattenDiagnosticMessageText(parsed.error.messageText, "\n"),
    );
  if (parsed.config.extends)
    throw new Error(
      "Graph config inheritance requires explicit resolver support",
    );
  const converted = convertCompilerOptionsFromJson(
    parsed.config.compilerOptions ?? {},
    configDirectory,
  );
  if (converted.errors.length)
    throw new Error(
      converted.errors
        .map((error) => flattenDiagnosticMessageText(error.messageText, "\n"))
        .join("\n"),
    );
  return converted.options;
}

export function analyzeFileGraph(files, compilerOptions, root) {
  const normalize = (path) => posix.normalize(path.replaceAll("\\", "/"));
  const absoluteRoot = normalize(resolve(root));
  const sources = new Map();
  const directories = new Set();
  for (const input of files) {
    const path = normalize(input.path);
    if (/\.(spec|test)\.tsx?$|\.d\.ts$/.test(path)) continue;
    const absolute = posix.join(absoluteRoot, path);
    sources.set(absolute, { path, source: input.source });
    let directory = posix.dirname(absolute);
    while (!directories.has(directory)) {
      directories.add(directory);
      const parent = posix.dirname(directory);
      if (parent === directory) break;
      directory = parent;
    }
  }
  const host = {
    fileExists: (path) => sources.has(normalize(path)),
    readFile: (path) => sources.get(normalize(path))?.source,
    directoryExists: (path) => directories.has(normalize(path)),
    getCurrentDirectory: () => absoluteRoot,
    useCaseSensitiveFileNames: () => true,
  };
  const cache = createModuleResolutionCache(
    absoluteRoot,
    normalize,
    compilerOptions,
  );
  const graph = new Map();
  const findings = new Map();
  const add = (rule, file, detail) => {
    const id = JSON.stringify([rule, file, detail]);
    findings.set(id, { id, rule, file, detail, package: "D4" });
  };
  for (const [absolute, input] of sources) {
    const targets = new Set();
    graph.set(input.path, targets);
    const tree = createSourceFile(
      input.path,
      input.source,
      ScriptTarget.Latest,
      true,
    );
    if (tree.parseDiagnostics.length)
      add(
        "file-graph-parse-error",
        input.path,
        "TypeScript syntax could not be fully parsed",
      );
    function dependency(specifier) {
      if (!specifier.startsWith(".") && !specifier.startsWith("@api/")) return;
      const resolved = resolveModuleName(
        specifier,
        absolute,
        compilerOptions,
        host,
        cache,
      ).resolvedModule;
      const target =
        resolved && sources.get(normalize(resolved.resolvedFileName));
      if (target) targets.add(target.path);
      else add("unresolved-local-import", input.path, specifier);
    }
    function visit(node) {
      if (
        (isImportDeclaration(node) || isExportDeclaration(node)) &&
        node.moduleSpecifier &&
        isStringLiteral(node.moduleSpecifier)
      ) {
        dependency(node.moduleSpecifier.text);
      } else if (
        isImportTypeNode(node) &&
        isLiteralTypeNode(node.argument) &&
        isStringLiteral(node.argument.literal)
      ) {
        dependency(node.argument.literal.text);
      } else if (
        isImportEqualsDeclaration(node) &&
        isExternalModuleReference(node.moduleReference) &&
        node.moduleReference.expression &&
        isStringLiteral(node.moduleReference.expression)
      ) {
        dependency(node.moduleReference.expression.text);
      } else if (
        isCallExpression(node) &&
        (node.expression.kind === SyntaxKind.ImportKeyword ||
          (isIdentifier(node.expression) && node.expression.text === "require"))
      ) {
        const argument = node.arguments[0];
        if (argument && isStringLiteral(argument)) dependency(argument.text);
        else
          add(
            "file-graph-unresolved-dynamic-import",
            input.path,
            "nonliteral import/require",
          );
      }
      forEachChild(node, visit);
    }
    visit(tree);
  }
  for (const members of findDependencyCycles(graph)) {
    add(
      "file-cycle",
      "apps/api/src",
      `strongly connected group: ${members.join(", ")}`,
    );
  }
  return [...findings.values()].sort((a, b) => a.id.localeCompare(b.id, "en"));
}
