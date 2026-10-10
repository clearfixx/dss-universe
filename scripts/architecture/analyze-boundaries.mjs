/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Architecture Tooling
 * 📄 File: scripts/architecture/analyze-boundaries.mjs
 *
 * 🎯 Purpose:
 * Inventories static API dependency violations without changing application behavior.
 *
 * 🧠 Responsibilities:
 * • parses TypeScript dependencies and explicit export surfaces;
 * • reports ownership/layer violations with stable baseline identities.
 *
 * 🏗️ Architecture:
 * Pure analysis over supplied source text; the CLI owns filesystem access.
 *
 * ⚠️ Important:
 * This is a bounded static inventory, not a type-checker or security sandbox.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { createRequire } from "node:module";
import { posix } from "node:path";
import { findDependencyCycles } from "./find-dependency-cycles.mjs";

// Use the API's declared compiler dependency, not an accidental root hoist.
const requireApi = createRequire(
  new URL("../../apps/api/package.json", import.meta.url),
);
const {
  createSourceFile,
  ScriptTarget,
  forEachChild,
  isImportDeclaration,
  isExportDeclaration,
  isImportTypeNode,
  isCallExpression,
  isStringLiteral,
  isIdentifier,
  isImportEqualsDeclaration,
  isExternalModuleReference,
  isNamespaceImport,
  isNamedImports,
  isNamedExports,
  isNamespaceExport,
  SyntaxKind,
} = requireApi("typescript");

function moduleOwner(path) {
  return path.match(/^apps\/api\/src\/modules\/([^/]+)(?:\/|$)/)?.[1];
}

function targetPath(file, specifier) {
  if (specifier.startsWith("@api/")) {
    return posix.normalize(`apps/api/src/${specifier.slice(5)}`);
  }
  if (specifier.startsWith(".")) {
    return posix.normalize(posix.join(posix.dirname(file), specifier));
  }
  return null;
}

function bindings(node) {
  if (isImportDeclaration(node)) {
    const clause = node.importClause;
    const names = [];
    if (clause?.name) names.push(clause.name.text);
    const named = clause?.namedBindings;
    if (named && isNamedImports(named)) {
      names.push(
        ...named.elements.map(
          (element) => (element.propertyName ?? element.name).text,
        ),
      );
    }
    return names;
  }
  if (
    isExportDeclaration(node) &&
    node.exportClause &&
    isNamedExports(node.exportClause)
  ) {
    return node.exportClause.elements.map(
      (element) => (element.propertyName ?? element.name).text,
    );
  }
  return [];
}

export function analyzeBoundaries(files) {
  const findings = new Map();
  const graph = new Map();
  const add = (rule, file, detail) => {
    const id = JSON.stringify([rule, file, detail]);
    findings.set(id, {
      id,
      rule,
      file,
      detail,
      package: file.includes("/auth/") || file.includes("/iam/") ? "D3" : "D4",
    });
  };

  for (const input of files) {
    const file = input.path.replaceAll("\\", "/");
    if (/\.(spec|test)\.tsx?$|\.d\.ts$/.test(file)) continue;
    const owner = moduleOwner(file);
    const tree = createSourceFile(
      file,
      input.source,
      ScriptTarget.Latest,
      true,
    );
    if (tree.parseDiagnostics.length) {
      add("parse-error", file, "TypeScript syntax could not be fully parsed");
    }
    const composition = file.endsWith(".module.ts");
    const publicEntry = Boolean(
      owner && file === `apps/api/src/modules/${owner}/index.ts`,
    );
    const businessLayer =
      owner && !file.includes("/infrastructure/") && !composition;

    function dependency(specifier, names = []) {
      const target = targetPath(file, specifier);
      const foreign = target && moduleOwner(target);
      if (
        businessLayer &&
        (specifier.startsWith("@prisma/") ||
          /\/core\/database(?:\/|$)/.test(target ?? ""))
      ) {
        add("persistence-outside-infrastructure", file, specifier);
      }
      if (
        file.includes("/domain/") &&
        target &&
        /\/(application|presentation|infrastructure)(?:\/|$)/.test(target)
      ) {
        add("domain-outer-layer", file, specifier);
      }
      if (file.startsWith("apps/api/src/core/") && foreign) {
        add("core-feature-import", file, specifier);
      }
      if (owner && foreign && foreign !== owner) {
        if (!graph.has(owner)) graph.set(owner, new Set());
        graph.get(owner).add(foreign);
        const tail = target.slice(`apps/api/src/modules/${foreign}`.length);
        const publicPath =
          tail === "" ||
          tail === "/index" ||
          tail === "/index.ts" ||
          tail === "/index.js";
        const moduleWiring =
          composition && /^\/[^/]+\.module(?:\.[cm]?[jt]s)?$/.test(tail);
        if (!publicPath && !moduleWiring)
          add("foreign-private-import", file, specifier);
        const concrete = names.filter((name) => /Service$|Mapper$/.test(name));
        if (concrete.length)
          add(
            "foreign-concrete-service",
            file,
            `${specifier}: ${concrete.sort().join(", ")}`,
          );
      }
    }

    function visit(node) {
      if (isImportDeclaration(node) || isExportDeclaration(node)) {
        const specifier = node.moduleSpecifier;
        if (specifier && isStringLiteral(specifier))
          dependency(specifier.text, bindings(node));
        if (
          isExportDeclaration(node) &&
          (!node.exportClause || isNamespaceExport(node.exportClause))
        ) {
          add("wildcard-export", file, specifier?.text ?? "<local>");
        }
        if (
          isImportDeclaration(node) &&
          node.importClause?.namedBindings &&
          isNamespaceImport(node.importClause.namedBindings)
        ) {
          add("namespace-import", file, specifier?.text ?? "<local>");
        }
        if (publicEntry && isExportDeclaration(node)) {
          const concrete = bindings(node).filter((name) =>
            /Service$|Mapper$|^Prisma/.test(name),
          );
          if (concrete.length)
            add(
              "concrete-public-export",
              file,
              `${specifier?.text ?? "<local>"}: ${concrete.sort().join(", ")}`,
            );
        }
      } else if (
        isImportEqualsDeclaration(node) &&
        isExternalModuleReference(node.moduleReference)
      ) {
        const expression = node.moduleReference.expression;
        if (expression && isStringLiteral(expression))
          dependency(expression.text);
      } else if (isImportTypeNode(node)) {
        const literal = node.argument.literal;
        if (literal && isStringLiteral(literal)) dependency(literal.text);
      } else if (
        isCallExpression(node) &&
        (node.expression.kind === SyntaxKind.ImportKeyword ||
          (isIdentifier(node.expression) && node.expression.text === "require"))
      ) {
        const argument = node.arguments[0];
        if (argument && isStringLiteral(argument)) dependency(argument.text);
        else
          add("unresolved-dynamic-import", file, "nonliteral import/require");
      }
      forEachChild(node, visit);
    }
    visit(tree);
  }
  for (const members of findDependencyCycles(graph)) {
    add(
      "module-cycle",
      "apps/api/src/modules",
      `strongly connected group: ${members.join(", ")}`,
    );
  }
  return [...findings.values()].sort((a, b) => a.id.localeCompare(b.id, "en"));
}

export function compareBaseline(findings, baseline) {
  const current = new Set(findings.map((entry) => entry.id));
  const previous = new Set(baseline.map((entry) => entry.id));
  return {
    added: findings.filter((entry) => !previous.has(entry.id)),
    removed: baseline.filter((entry) => !current.has(entry.id)),
  };
}
