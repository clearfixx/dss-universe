# ADR-0004 — Tiptap-based DSS Editor

- Status: Accepted
- Date: 2026-07-18

## Context

News, Research Lab, Knowledge Forge, Community Hub and comments need related but different editors. HTML-only storage is unsafe and hard to evolve; a custom editor engine would consume substantial effort.

## Decision

Build DSS Editor as a product layer over Tiptap/ProseMirror. Store validated versioned JSON as the canonical document. Render sanitized HTML server-side. Use Shiki for `pre`/`code` syntax highlighting with a VS Code-like appearance. Define editor profiles for publications, topics and comments. Model media references and Content Gates as structured nodes.

## Consequences

- the UI is custom while the editing engine is proven;
- schema migrations are required when node contracts change;
- raw BBCode is not the canonical format;
- copy/paste and import require sanitization;
- AI output must be converted into and validated against the document schema.
