# D4 — AI Core operation and external-data boundary review

2026-10-19. Source baseline `9cb91b4e303df7fd9c400340bdf35dd1df37b738`,
stacked on draft PR #42, not an accepted release baseline. Documentation-only
review: no runtime, provider configuration, permission, schema or UI changes.

## Reviewed scope

All eight non-test TypeScript sources under `apps/api/src/modules/ai-core/`:
module, index, application service, provider contract, versioned prompts, domain
command types, OpenAI infrastructure provider and GraphQL presentation. Also
read both existing specs, module README, Core OpenAI config/validation,
PermissionsGuard, permission registry, permission and role-permission seeds.
AppModule imports AiCoreModule. Symbol/import search found no external feature
consumer of EditorAiService in API/Worker/packages; this is bounded discovery,
not a certificate against aliases, generated clients or future consumers.

## Operation trace

| Operation                   | Authority, data and side effects                                                                                                                                                                     | Evidence limits                                                                                                                      |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| runEditorAiCommand          | JWT + PermissionsGuard, explicit ai.editor.use; actor ID comes from authenticated context; validated GraphQL input                                                                                   | No dedicated live GraphQL authorization test identified by the bounded test search                                                   |
| EditorAiService.run         | trims input, requires external-processing confirmation; source/instruction 12000/1000 character bounds; command-specific source/instruction checks; provider call; trimmed output 1–24000 characters | No persistence, document read, publication or insertion; requiresConfirmation is returned metadata, not proof of client confirmation |
| prompt construction         | fixed version/instructions plus JSON profile, command, language, author instruction and selected source                                                                                              | Selected source leaves DSS after explicit confirmation; no content document is fetched by this module                                |
| safety identifier           | SHA-256 of opaque actor ID, separate from content input                                                                                                                                              | Pseudonymous stable identifier, not anonymization; no username/email/credential read in reviewed module                              |
| OpenAiTextProvider.generate | config-only key/model/base URL; POST /responses; bearer credential in header, store:false, strict content JSON schema, requested output-token bound, AbortSignal timeout                             | External network side effect, no DSS DB transaction; store:false is a request flag, not evidence of every provider retention policy  |
| response mapping            | requires completed status/string ID/model/output; parses content object; maps safe-integer usage or null; service bounds text                                                                        | Existing tests do not cover malformed outer JSON/output arrays, all timeout/network/error branches or oversized output               |
| wiring/public surface       | private provider token; Nest exports concrete EditorAiService; index has three wildcard exports                                                                                                      | D4.4 narrowing remains required; no speculative public contract introduced here                                                      |

No Prisma, SQL, Audit, Outbox, generation ledger or queue operation occurs in
these fully read module sources. This conclusion follows the actual operations,
not merely zero lexical Prisma matches. No credentials/profile/foreign aggregate
are fetched by the reviewed service/provider. Logging middleware, observability,
client insertion and provider-side retention require their own wider traces.

## Permissions and product distinctions

The seed does not grant AiEditorUse explicitly to user/moderator/admin. However,
owner receives every PERMISSION_LIST key, including this permission. Seed upserts
do not revoke pre-existing custom grants. Therefore README wording about ordinary
roles is not evidence that no installation can invoke AI, nor is a live database
grant state certified. No seed ran and no provider secret was inspected or used.

Current code implements text-assistance commands, not the owner's requested
DSS Intelligence greeting or news-poster generation. This review does not add
those functions, change their roadmap placement, or count the existing text
foundation as their completion. Product/roadmap reconciliation remains D1/D7
work; future AI scope requires its approved phase package.

## Verification

Existing AI Core tests rerun on this branch: **5/5 PASS, 2 suites, normal exit 0**.
Service tests cover labeled proposal/hash, absent confirmation/source and empty
output; provider tests cover structured request/usage and absent config. The
test named for empty or excessively large output only exercises empty output.
Transport fetch is mocked; no paid provider request, live HTTP authorization,
retention compliance, persistent quota or usage ledger is certified.

This documentation-only increment does not rerun or replace the full runtime
quality gate from parent PR #42: API coverage 1101/1101, serial E2E 501/503 with
two DEBT-045 failures; known format/dependency/GraphQL failures and retained Jest
handles remain unresolved. Changed Markdown formatting/diff checks are required
for this delivery. D4 exhaustive reconciliation, D4.4/D4.5, D5–D7, stack audit,
CI/review/owner acceptance and Phase 11 brainstorm remain open.

Subsequent bounded D4.4 correction removes the concrete Nest service and all
three wildcard entry exports while keeping providers/resolver private and
unchanged. See [runtime surface evidence](D4_4_AI_CORE_EXPLICIT_SURFACE.md);
the table above remains historical to this audit baseline, not current exports.
