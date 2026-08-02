# Phase 9 — DSS Editor Foundation

## Outcome

DSS Universe now has one shared structured-document contract instead of future
News, Research Lab, Knowledge Forge, Community Hub, and Comments modules
inventing incompatible rich-text formats.

## Canonical document

```text
EditorDocument
  schemaVersion
  profile: FULL | FORUM | COMPACT
  content: Tiptap / ProseMirror JSON doc
```

Only validated JSON is canonical. HTML, plain text, and normalized search text
are rebuildable projections. Raw user HTML is neither accepted nor persisted.

## Profile boundary

- `FULL` supports publication headings, structured media, attachments, code,
  mentions, and Content Gates;
- `FORUM` supports the topic authoring surface with reduced heading depth;
- `COMPACT` supports comments and messages without headings or Content Gates.

All profiles have explicit character, node, mark, and node allowlists. The
server validates independently from the Tiptap client.

## Structured platform nodes

- Mention stores `userId` and display username attributes;
- Media Reference and Attachment store DSS Media Platform IDs, never raw
  storage locations;
- Code Block stores an allowlisted language and is rendered with Shiki's
  VS Code `dark-plus` theme;
- Content Gate stores the ID of a policy owned by the future Content Gate
  Platform.

## Runtime flow

```text
Tiptap Client
  → versioned canonical JSON
  → GraphQL owning-module command
  → @dss/editor validation
  → owning-module persistence
  → safe HTML / plain / search projections
```

The preview query proves the validation and projection boundary but does not
store drafts or grant publication authority.

## Deferred work

- drafts, autosave, conflict/version workflow;
- comments migration from bounded text to `COMPACT` documents;
- Media Library picker, upload, and reference hydration;
- mention suggestions;
- Content Gate rules and API redaction;
- module-specific forms and permissions;
- AI Core editing commands.

These remain separate packages so the schema foundation does not accidentally
become a generic content ownership module.
