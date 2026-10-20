# D4 — News interaction audience reconciliation

Date: 2026-10-20. Base: `6eaf383` / draft PR65.
Branch: `audit/d4-news-interaction-audience`.
Scope: current viewer-less News interaction route; no runtime correction.

## Source trace

The optional engagement JWT guard supplies an authenticated actor or no actor.
AudienceEngagementService converts absence into the string `anonymous` before
asking InteractionTargetsService for READ/SHARE. Canonical target lifecycle and
registered owner-policy dispatch still execute. Root News binding copies owner
and target IDs plus capability, but does not forward any viewer context. News
policy checks publication status and interaction flags, not audience or canonical
publication time. Comment target READ delegates to its parent's READ decision.

Direct News delivery uses a separate viewer-aware eligibility predicate:
PUBLISHED, non-null publishedAt and PUBLIC or authenticated MEMBERS audience.
The earlier secondary-projection fix also applies this to News comment/vote
pages. Those fixes are present, not newly reproduced unfixed body leaks.

Relevant source: NewsInteractionPolicy, InteractionOwnerBindingsService,
AudienceEngagementService/Resolver, InteractionTargetsService/registry/
registrations, CommentInteractionPolicy and PrismaAudienceEngagementRepository;
News delivery reader/service and actual workflow/template guards were traced.
The persistence operation creates a deduplicated view/share then returns all
aggregate view/share counts. It does not return authored article/comment text.

## Actual migrated HTTP evidence

New test: `apps/api/test/news-interaction-audience-characterization.e2e-spec.ts`.
All eight cases pass, normal exit0,11.147s. A passing defect characterization is
not an accepted security contract.

- Real Auth credentials, authoritative session revocation and no successful
  access-decision mocks. A narrowly granted reviewer has only actual IAM
  news.review/news.publish permissions in the isolated fixture.
- News draft → submit → approve → publish uses actual services and evidence;
  publication time and approved version are checked. Only synthetic values are
  used. An opaque synthetic cover ID does not test Media binary processing.
- PUBLIC guest delivery and view/share idempotency remain positive controls;
  a real authenticated member can view and engage MEMBERS News.
- Guest, invalid-token and revoked-session requests get null Full News for a
  normally published MEMBERS article, but both view and share succeed. After a
  legitimate member's first events, guests receive aggregate counts2/2. Actual
  stored guest rows (actorId null) prove one additional view and share.
- A comment under MEMBERS News is absent from guest newsComments (zero items/
  count), yet guest recording a view against its reaction target succeeds.
  No comment body or article text disclosure is established by this test.
- Unpublished targets and disabled sharing still reject and persist no event.
- A deliberately corrupted/imported PUBLISHED row with publishedAt null remains
  hidden by Full News but permits shared view recording. This is a separate
  availability-parity observation; normal workflow does not produce that state
  and no public mutation creating it is claimed.

Fixtures apply actual migrations to their own random schema and drop only that
schema. Presence wrappers call the real implementation and drain its pending
writes before teardown; they do not grant access. Dev DB is not mutated.

## Finding and boundary for correction

DEBT-071: Medium confidentiality/integrity issue for protected aggregate
engagement and unauthorized statistic writes. Target UUID knowledge is required;
target discovery, text/password/token exposure, or broader account compromise
is not established. Do not describe this as Full News body leakage.

Proposed separate pre-11 security correction: carry explicit viewer context
through narrow owner contracts and apply current News eligibility before these
effects/aggregate reads, including inherited comment READ. Preserve PUBLIC
guest analytics/idempotency, valid member access, flags, failure propagation,
current API and bounded query work; do not introduce new ACL or timeout changes.
The owner approved this separate correction package on2026-10-20, with design
first. Detailed guest representation and persistence boundary remain to design.

Adjacent compatibility limit: root Wall binding forwards the current string
actor; its contract requires a string and its policy explicitly denies PRIVATE,
not MEMBERS. A global replacement of the `anonymous` sentinel could therefore
change Wall behavior or still fail to enforce guest policy. Its guest HTTP
behavior has not been independently characterized here; do not claim it fixed,
safe or a second proven defect. Any broader correction needs its own disposition.

## Verification and acceptance boundary

Initial focused8/8 passes. Final four-suite focused52/52, zero skipped, normal
exit0: new characterization8, owner policy18, secondary audience21 and social
privacy5. The first lint run found bind() erasing presence-method types; the
established typed bound-method pattern fixes it without suppressions. Final
workspace lint/types and Prisma validation/generation pass; API1175/1175 with
all four DB/Redis opt-ins, zero skipped,117.389s. Global format41 and audit one
high/eleven moderate remain red. Build succeeds (six tasks, five cached,
36.282s); architecture/license140 and zero inventory additions pass. Adjacent
Editor23, Storage43, Worker46, Web59 and patch14 tests also pass.

Complete migrated E2E:521/522 across50 suites, zero skipped,419.005s; App27/27
and this characterization8/8 pass. The only failing suite is inherited DEBT-045
(News viewCount null/zero expectation and target-retirement cleanup). This is
not a green suite. After completed JSON output and verification of zero other
DB clients/isolated fixture schemas, only the matching completed Jest PID2704
was stopped because of retained handles; the wrapper exits-1, not a normal
green process exit. The disposable5435 database was freshly migrated; dev5433
was not reset.

GraphQL consistency exits1 with the inherited DEBT-044 generated barrel
eslint-disable difference. Only this generator side effect was restored to
HEAD; SDL and generated files have no committed diff. Restoring it does not
turn the failed gate green. Publication/CI/review acceptance remain pending.
Correction approval is received, not runtime implementation. No runtime, schema,
transport, dependency or frontend change is included. Full D4 remains open.

Dependency observation under existing DEBT-016: compared with the earlier
DEBT-070 audit JSON, the new inventory adds moderate Vite advisory
[GHSA-698v-4r3x-3vcv](https://github.com/advisories/GHSA-698v-4r3x-3vcv).
The reviewed advisory was updated2026-10-20 and describes launch-editor Windows
argument escaping, with attacker file placement and additional stated
prerequisites. No exploitability in DSS is established. No manifest/lockfile
change caused this packet's difference; dependency remediation remains separate.
