# AI Core Passport 🤖

## Purpose

AI Core owns optional, cross-platform artificial-intelligence orchestration.
Normal DSS product flows must continue to work when no provider is configured.

## Current foundation

- provider-neutral structured text-generation contract;
- versioned DSS Editor command prompts;
- generate, rewrite, expand, shorten, explain and code commands;
- explicit external-processing confirmation;
- permission-protected GraphQL command boundary;
- OpenAI Responses adapter with structured output, `store: false`, hashed safety
  identifier and bounded timeout;
- generated-content labels and mandatory human confirmation before insertion.

## Boundary

AI Core proposes content. DSS Editor owns document editing, and content modules
own drafts, review and publication. AI Core never publishes autonomously.

The provider is disabled unless both `OPENAI_API_KEY` and `OPENAI_MODEL` are
configured. The `ai.editor.use` permission is registered but is not granted to
ordinary system roles until persistent quotas and the usage/cost ledger arrive
in Phase 21.

## Deferred to Phase 21

- persistent generations and usage/cost ledger;
- quotas and cancellation;
- moderation and audit workflows;
- provider/model routing;
- non-editor AI integrations.

🚀 Build. Share. Grow.
