# Phase 9 — Completion Audit

## Decision

Phase 9 is complete. Its responsibility is the reusable interaction, editor,
content-access and activity infrastructure. It does not create the canonical
News, Forum, Knowledge Forge, Academy or Moderation products ahead of their
roadmap phases.

## Acceptance matrix

| Definition of Done                                             | Evidence                                                                                                                                    |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| One canonical document renders safely across modules           | `@dss/editor` profiles, bounded validation, safe HTML/plain/search projections and document-grade extension tests                           |
| Hidden content cannot be extracted from unauthorized responses | `EditorContentDeliveryService` recursively removes denied gate children; regression tests search the serialized response for protected text |
| Feed survives optional AI summary failure                      | Deterministic Activity Feed is canonical; Command Deck loads it independently and renders a non-AI fallback                                 |
| Shared capabilities preserve domain ownership                  | Interaction Targets hold coordinates, source modules retain bodies and publication policy, and derived projections remain rebuildable       |

## Delivered boundaries

- Interaction Targets: canonical FK-backed identities and owner-policy checks.
- Comments: documents, replies, revisions, tombstones, mentions and drafts.
- Reactions and Bookmarks: idempotent shared relationships and projections.
- Reports: review queue and non-destructive moderation annotations.
- DSS Editor: product profiles, autosave, Media, mentions, Content Gates, AI
  suggestions and document-grade extensions.
- Content Access: reusable policy evaluation and fail-closed delivery redaction.
- Activity Feed: public/member reads, personalization, filters, unread state and
  deterministic recommendations.

## Explicitly deferred ownership

- News publication workflows — Phase 10.
- Knowledge Forge revisions and review — Phase 11.
- Community Hub topics and category subscriptions — Phase 12.
- Moderation sanctions and Premium override enforcement — Phase 14.
- Notification inbox and delivery — Phase 15.
- Full Universe Landing feed presentation — Phase 19.
- AI feed summaries and quota/cost policy — Phase 21.

These are planned integrations, not incomplete Phase 9 foundations.

## Verification

The closure gate consists of repository formatting, lint, TypeScript, Prisma
validation, unit tests, production builds, architecture/license checks, GraphQL
code generation consistency, complete API E2E, web E2E and a dedicated Activity
Feed E2E proving guest visibility, member ranking, block filtering and visit
state.
