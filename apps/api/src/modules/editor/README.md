# DSS Editor Platform Passport ✍️

## Purpose

The server-side Editor Platform validates and projects one canonical,
versioned Tiptap JSON document contract for every DSS content module.

## Current foundation

- shared `@dss/editor` framework-neutral contract;
- `FULL`, `FORUM`, and `COMPACT` profile allowlists;
- structured mention, Media Reference, attachment, code, and Content Gate
  nodes;
- bounded recursive server validation;
- canonical JSON plus derived plain-text and search projections;
- escaped HTML projection with Shiki `dark-plus` code highlighting;
- authenticated GraphQL preview endpoint;
- SSR-safe Tiptap frontend shell.

## Boundary

DSS Editor owns document shape, validation, and projections. News, Research
Lab, Knowledge Forge, Community Hub, and Comments own their records, drafts,
publication state, revisions, and permissions.

HTML is never canonical input. Media nodes carry DSS Media Platform IDs rather
than storage URLs. Content Gate nodes reference policies owned by the Content
Gate Platform.

## Deferred integrations

- draft persistence and autosave;
- comment JSON migration;
- Media picker and mention autocomplete;
- Content Gate policy builder and viewer evaluation;
- owning-module publication workflows;
- AI-assisted document commands.

🚀 Build. Share. Grow.
