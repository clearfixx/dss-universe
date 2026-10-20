# DEBT-071 — Explicit viewer context for News interactions

Date: 2026-10-20; verification continues on 2026-10-21 (Europe/Kyiv).
Design base: `4683f1f` / draft PR #66.
Branch: `debt/debt071-viewer-context-design`.
Status: separate correction and both detailed boundary decisions owner-approved.
This packet changes documentation only, not authorization or persistence.

## Required outcome and evidence

[Migrated HTTP evidence](../audits/D4_NEWS_INTERACTION_AUDIENCE.md) proves that
guests, invalid tokens and revoked sessions cannot receive MEMBERS Full News,
but can record its views/shares and receive aggregate counts. A comment target
inherits the same gap through its parent's READ. No authored-body or credential
leak, target discovery or account takeover was established.

Before any engagement repository call, the owner decision must enforce the
article's existing delivery eligibility, not a new ACL. Preserve PUBLIC guest
analytics, stable guest hashing/account keys, deduplication, channel aggregates,
valid members, lifecycle restrictions and per-capability flags. The owner
approved design first on 2026-10-20, not an unreviewed global policy rewrite.

## Current boundary and affected call sites

The source paths below are relative to `apps/api/src/`.

| Owner                        | Current evidence                                                                                                                        | Proposed responsibility                                                                                                    |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Core/Auth transport          | `core/auth/strategies/jwt.strategy.ts` verifies the current session and reads current access before creating request.user               | Keep token/session/account validation here; no new Auth call from News                                                     |
| Interactions presentation    | `modules/interactions/presentation/graphql/resolvers/audience-engagement.resolver.ts` permits guest fallback, including rejected tokens | Supply only the verified subject ID or absence; visitorId is never identity authority                                      |
| Interactions application     | `audience-engagement.service.ts` currently invents the string `anonymous`                                                               | Construct explicit guest/authenticated context for authorization; retain original optional actorId for persistence         |
| Interactions target/registry | `interaction-targets.service.ts`, `interaction-policy-registry.service.ts`, `interaction-policy-registrations.service.ts`               | Forward required viewer context, preserve canonical/lifecycle checks, owner registration identity and fail-closed behavior |
| Comment policy               | `modules/interactions/application/services/comment-interaction.policy.ts`                                                               | Forward the same viewer to parent READ, not the comment author's identity                                                  |
| Root composition             | `composition/interaction-policies/interaction-owner-bindings.service.ts` currently drops the actor on the News path                     | Translate explicit minimal contexts independently for each owner; no access policy here                                    |
| News                         | `modules/news/application/services/news-interaction.policy.ts` reads one owned article                                                  | Enforce publication, audience and existing flags using that record; return only allowed/reason                             |

Other existing authenticated callers of `InteractionTargetsService.authorize`
are CommentsService, CommentDraftsService, ReactionsService, BookmarksService,
ModerationService and InteractionTargetsResolver. Their service/GraphQL inputs
remain unchanged; at the local target call they explicitly construct authenticated
context from the already supplied trusted actor. Do not broaden guest access to
these commands or gate private bookmark removal/listing with new target policy.
No other production target-policy implementation was found beyond Comment and
the root-registered News/Wall callbacks in the bounded source inventory.

## Proposed contracts

Interactions owns a pure, readonly discriminated union in its domain types,
published by an explicit named type export only:

```ts
type InteractionViewer =
  | Readonly<{ kind: "GUEST" }>
  | Readonly<{ kind: "AUTHENTICATED"; subjectId: string }>;
```

The context is required by target authorization, local policy dispatch and
`InteractionPolicyRequest`; replace its actorId field, do not keep two potentially
contradictory identities. No optional viewer default, truthy string test or
`string | object` overload. The typed context is an internal trusted application
input, not a bearer credential or something accepted from a GraphQL argument.
At guest-capable entry points it is constructed only from request.user established
by the existing guard/strategy. Invalid/expired/revoked credentials remain guests,
never authenticated merely because a token header or visitorId is present.

News owns its independent contract value:

```ts
type NewsInteractionViewer = "GUEST" | "AUTHENTICATED";
```

Add required `viewer` to NewsInteractionRequest. Root maps the Interactions tag
to this News-owned value; subjectId is not forwarded because current News audience
policy does not need it. Neither owner imports the other's types or services.
No email, username, role, permission, session/token, profile, visitor key or full
target/ORM record crosses the owner boundary. The public GraphQL SDL is unchanged.
No new DI token, global viewer service or shared business-context package is needed.

Unknown runtime viewer tags must fail closed rather than fall through to a member
or PUBLIC allow. Test this explicitly at the owned dispatcher/composition boundary;
TypeScript types alone do not establish runtime validation. Rejected malformed
internal context must never reach the engagement repository.

## News eligibility and decision order

Retain canonical target existence, RETIRED denial and LOCKED non-READ denial
before owner dispatch. Inside News:

1. Keep article existence and article/target coordinate match.
2. Require PUBLISHED and non-null canonical publishedAt. Do not use
   displayPublishedAt or scheduledFor as publication authority.
3. PUBLIC allows either viewer state; MEMBERS requires AUTHENTICATED.
4. Apply unchanged COMMENT/REACT/SHARE flags; READ/BOOKMARK do not acquire new flags.

This is the same article-level predicate used by
`PrismaNewsDeliveryRepository.where` and its secondary eligibleTarget reads.
No author/staff/Premium bypass, new group ACL or future sanction engine is added.
Content Gates inside a readable PUBLIC document remain separately redacted by
Editor/Content Access: a partially gated document is not an inaccessible article.
Do not call Full News, load a display profile or evaluate document gates to decide
whether one engagement event is allowed. Keep one existing News findById call.
Add parity tests between delivery and interaction decisions, rather than importing
a Prisma where fragment into application policy or moving policy into root.

Keep existing denial reasons for existing coordinate/status/flag failures. Use a
bounded News-owned reason for audience denial; publishedAt-null uses publication
denial. No change to GraphQL operation names, inputs, output fields or error envelope.

## Wall compatibility decision — owner-approved

Users currently requires string viewerId and the root passes `anonymous` for a
guest. Wall policy checks blocks and PRIVATE visibility; its guest/MEMBERS HTTP
semantics were not independently established in PR #66. Do not infer that these
semantics are safe or that a second vulnerability has been proven.

Owner-approved on 2026-10-20: only the root Wall binding maps
GUEST back to the exact previous `anonymous` string, and AUTHENTICATED to subjectId.
News and the shared target chain never interpret this sentinel as authentication.
Users' Wall contract/policy/query behavior stays unchanged. Pin the old and new
Wall owner requests and decisions with compatibility tests, including parent
comment routing, owner/private/block/lifecycle/unavailable-provider behavior.
This bridge preserves behavior; it is not a security certification or a permanent
cross-platform guest identity contract. No sentinel is persisted as actorId.

Reject globally making viewerId nullable or skipping Wall block checks in this
packet: either would change another owner's behavior without its own evidence and
disposition. If real compatibility characterization confirms an additional defect,
document it and seek separate correction approval; do not silently normalize it.

## Persistence and freshness boundary — owner-approved

Owner-approved on 2026-10-20: keep current pre-authorization followed by the
existing engagement repository's transaction: insert with skipDuplicates, then
counts/groupBy. A denial or owner
exception must invoke neither insertion nor aggregate reads. Preserve guest actorId
null, account actorId, SHA-256 guest keys, account keys, share channels and replay
behavior. No migration, table, isolation, timeout, locking or cache change.

This is a request-time authorization check, not an atomic authorization/write
snapshot. Session or article state can change after the corresponding check;
current code has this boundary already. The correction must honor changes made
before a new request and must not cache an earlier allow. Do not claim linearizable
revocation or visibility changes racing a write. Achieving that stronger guarantee
would require a separately reviewed cross-owner transaction/locking design; simply
raising isolation or rechecking once does not establish it.

## Runtime package and acceptance matrix

After detailed approval, create a separate runtime branch/PR stacked on the
reviewed design. Implement the context chain, narrow root mapping, News predicate,
then turn the passing defect assertions into red-before/green-after regressions.
All new/materially changed authored sources receive truthful DSS File Passports;
DTO files remain DTO-only, exports/imports explicitly named.

Required evidence before runtime acceptance:

- Actual migrated HTTP: guest/invalid/expired/revoked/disabled-account access to
  MEMBERS view and share is denied with no returned counters and no persisted
  guest effects. Existing anonymous PUBLIC behavior remains available even with
  rejected credentials; only a current valid member gets member context.
- Same exclusions for comment-target views inherited from MEMBERS parent READ;
  PUBLIC/member comment cases remain allowed. Comment SHARE remains unavailable.
- Real publication workflow, every nonpublished state, publishedAt-null import
  corruption, wrong owner coordinates, RETIRED/LOCKED, disabled flags, missing/
  unbound owners and provider failures. No replacement of successful decisions
  with an always-allow fixture. Mocks may inject failure, not prove access safety.
- Guest and account idempotency, all channel counts, denied-operation repository
  non-invocation; current-session revocation and PUBLIC→MEMBERS change are observed
  by subsequent requests. No cross-request positive cache.
- Exact minimal registration/root request allowlists, viewer forwarding through
  comment ancestry and registration/unregistration identity/cleanup remain covered.
- Wall bridge parity for authenticated and guest request mapping; established
  owner/private/block/lifecycle behavior unchanged, including inherited comments.
- Actual query capture shows one News owner read per article authorization,
  unchanged fixed engagement transaction work for accepted events and no
  engagement write/count work for denied ones; no per-document/profile/Auth read
  added by News. Do not equate the existing target/comment ancestor reads with
  a new extra News lookup.
- Update older News fixtures that forge PUBLISHED with null publishedAt when they
  are intended to represent published content. Keep a dedicated null-date denial
  regression; do not weaken the production predicate to satisfy these fixtures.
- Full format/lint/types, Prisma validation/generation, migrated DB regressions,
  API coverage/E2E, adjacent suites, GraphQL consistency, build, architecture/
  license and dependency checks; CI, independent review and owner acceptance.
  Existing red gates remain blocking and are not waived by a focused security pass.

## Design-packet verification

Fresh design-packet checks on 2026-10-20/21: workspace lint9/9 and types9/9
(all cached), Prisma validation/generation, build6/6 (all cached,296ms),
architecture/license140/140 and frozen inventory zero additions pass. API
coverage1175/1175 across160 suites, zero skipped, normal exit0,60.857s; all four
DB/Redis flags enabled. Editor23, Storage43, Worker46, Web59 and patch14 tests
also pass. Local Markdown links resolve; changed-file format and diff checks pass.

Global format41 and dependency audit1 high/11 moderate remain red. GraphQL check
exits1 on the existing DEBT-044 generator-only eslint-disable barrel difference;
only that side effect was restored. SDL/generated source have no committed diff.
Full freshly migrated E2E:520/522 across50 suites, zero skipped,427.141s.
The characterization remains8/8; App26/27 has the inherited DEBT-048 (5s timeout).
The other failure is DEBT-045 News viewCount null/zero and retirement cleanup.
After complete JSON and zero other DB clients/isolated fixture schemas, only
the matching completed Jest PID13108 was stopped for retained handles; the
wrapper reports E2E_FULL_EXIT=1 after cleanup, not a normal green exit. No dev DB
reset or timeout/fixture repair is part of this design packet. The disposable5435
DB alone was recreated/migrated.

At publication preparation, base PR #66 head4683f1f has successful Linux/Windows
containment, failed dependency/Web smoke and the main quality job still in API
E2E; downstream GraphQL/build steps are pending, not successful. New design PR
CI and independent review/release acceptance remain separate and unproven.

Runtime source stays exactly at `4683f1f`: the design packet does not implement
its proposed contracts. Approval of this plan is not runtime completion, full D4
closure or permission to start Phase 11. Local E2E failure/retained-process results
are not waived by passing design checks or a cached build.
