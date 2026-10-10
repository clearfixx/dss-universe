/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Architecture Tooling
 * 📄 File: scripts/architecture/find-dependency-cycles.mjs
 *
 * 🎯 Purpose:
 * Finds deterministic strongly connected module groups in a dependency graph.
 *
 * 🧠 Responsibilities:
 * • identifies cyclic strongly connected components, including self-loops;
 * • returns stable member groups without claiming a particular cycle path.
 *
 * 🏗️ Architecture:
 * Pure graph algorithm; no source parsing or filesystem access.
 *
 * ⚠️ Important:
 * A static dependency cycle does not prove a runtime DI cycle.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export function findDependencyCycles(graph) {
  let nextIndex = 0;
  const index = new Map();
  const low = new Map();
  const stack = [];
  const active = new Set();
  const cycles = [];
  function visit(node) {
    index.set(node, nextIndex);
    low.set(node, nextIndex++);
    stack.push(node);
    active.add(node);
    for (const target of [...(graph.get(node) ?? [])].sort()) {
      if (!index.has(target)) {
        visit(target);
        low.set(node, Math.min(low.get(node), low.get(target)));
      } else if (active.has(target)) {
        low.set(node, Math.min(low.get(node), index.get(target)));
      }
    }
    if (low.get(node) !== index.get(node)) return;
    const members = [];
    let member;
    do {
      member = stack.pop();
      active.delete(member);
      members.push(member);
    } while (member !== node);
    if (members.length > 1 || graph.get(node)?.has(node))
      cycles.push(members.sort());
  }
  for (const node of [...graph.keys()].sort())
    if (!index.has(node)) visit(node);
  return cycles.sort((a, b) => a.join(",").localeCompare(b.join(","), "en"));
}
