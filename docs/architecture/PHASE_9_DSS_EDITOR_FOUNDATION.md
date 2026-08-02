# Phase 9 — DSS Editor Foundation

## Outcome

DSS Universe has one shared editor framework instead of separate rich-text
implementations for Community Hub, News, Research Lab, Knowledge Forge,
Comments, Messages and administrative content.

Tiptap/ProseMirror is the headless editing engine. DSS owns the canonical
contract, product profiles, toolbar, design, permissions, dialogs, persistence
and platform integrations.

## Canonical document

```text
EditorDocument
  schemaVersion
  profile
  content: Tiptap / ProseMirror JSON doc
```

Only validated JSON is canonical. HTML, plain text and normalized search text
are rebuildable projections. Raw user HTML is neither accepted nor persisted.

## Product profiles

- `COMMENT` — compact comments with formatting, alignment, links and media;
- `FORUM_REPLY` — richer replies with lists, quotes and code;
- `FORUM_TOPIC` — structured topics with headings and Content Gates;
- `NEWS` — newsroom publications;
- `RESEARCH_ARTICLE` — long-form Research Lab documents;
- `WIKI` — Knowledge Forge articles and future document-grade extensions;
- `MESSAGE` — private text, code and files;
- `ADMIN` — trusted system-authored content.

Every profile declares character/node limits, allowed nodes and marks,
capabilities, toolbar groups and heading levels. The same engine composes a
different surface for every module.

## Capability and permission boundary

Toolbar tools map to framework-neutral capabilities. Privileged controls are
resolved only when the host grants the corresponding editor permission:

- `MEDIA_UPLOAD` enables image, video and attachment dialogs;
- `CONTENT_GATE_CONFIGURE` enables hidden-content configuration;
- `AI_ASSIST` enables DSS AI Core commands.

This filtering is user experience, not authorization. Owning GraphQL commands
must recheck permissions before accepting media, policies or AI actions.

## Custom DSS interface

The toolbar, responsive behavior, icons, dialogs and styling are DSS-owned
React components. Dialog tools emit typed requests to the host module so Media
Platform, AI Core, Mention search and Content Gate builders can be embedded
without coupling the canonical package to React or Tiptap.

## Dependency policy

Only MIT-compatible Tiptap open-source packages may be used. Tiptap Pro, Cloud,
managed AI, comments, documents and collaboration are not platform
dependencies. The root architecture check rejects `@tiptap-pro/*` and
`@tiptap-cloud/*` packages.

## Runtime flow

```text
DSS product profile + actor permissions
  → Capability Registry
  → custom DSS toolbar + Tiptap engine
  → versioned canonical JSON
  → owning-module GraphQL command
  → server validation and authorization
  → owning-module persistence
  → safe HTML / plain / search projections
```

## Draft and autosave boundary

`@dss/editor` provides a storage-neutral autosave coordinator. It debounces
canonical documents, permits only one in-flight save, advances monotonic host
versions and exposes `DIRTY`, `SAVING`, `SAVED`, `CONFLICT`, and `ERROR`
states. Failed content remains available for an explicit retry.

The host module owns draft identity, authorization, persistence and conflict
resolution. This keeps News drafts in News, Knowledge Forge drafts in
Knowledge Forge, and prevents the editor framework from becoming a generic
content database.

## Deferred work

- owning-module draft persistence commands and restoration screens;
- Media Library picker and upload dialogs;
- mention suggestions;
- Content Gate rules and API redaction;
- module-specific publication forms;
- AI Core editing commands;
- Wiki tables, tasks, footnotes, TOC and revision tools.
