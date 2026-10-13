# D3 acceptance review

Date: 2026-10-13. Reviewed revision: `71bae5c`. Status: NOT ACCEPTED / draft PR.

Registration follow-up: the earlier missing-evidence inference was incomplete.
Existing real rollback E2E was found and rerun; eight isolated PostgreSQL tests
now add trigger failures and concurrent duplicates. Latest units: API 535,
Web 59, Worker 36. Four focused registration E2E pass, while the broad GraphQL
scenario times out (DEBT-048). See [correction/evidence](D3_REGISTRATION_POSTGRES_ATOMICITY.md).
The table incorporates the registration follow-up; CI observations retain their recorded revision.

| Requirement                                              | Evidence and limit                                                                                                                                                     |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth independent from Users internals                    | Whole production Auth application/domain search found no Users import, PrismaService or Prisma client reference; public integration surfaces pinned by AST regressions |
| Authoritative session eligibility                        | Access-session service/repository tests cover narrow projection, expiry, revocation, owner and version; detailed evidence in D3.1 report                               |
| Registration and combined profile transport outside Auth | Eight isolated PostgreSQL regressions and existing real rollback E2E verify the composition-owned transaction; see registration report                                 |
| Auxiliary Auth persistence/delivery                      | Owned recovery, verification, 2FA, counters and delivery ports; real DB/Redis tests enabled in latest full units                                                       |
| IAM private persistence and public boundary              | Permission/role/assignment ports and adapters; metadata and root-surface tests; no remaining D3 finding in the static inventory                                        |
| Immediate access revocation                              | Same-token REST/GraphQL authorization E2E and fail-closed read regressions; no claim of cancelling already running commands                                            |
| Existing assignment safety                               | DEBT-046 real concurrency/HTTP evidence; does not prove available platform owner                                                                                       |
| Hash implementation compatibility                        | Real bcrypt tests preserve cost 12, comparison and independent salts                                                                                                   |
| Current local package gates                              | 535 API, 59 Web, 36 Worker units and four focused registration E2E pass; broad GraphQL scenario times out; lint/typecheck/Prisma/build/architecture pass               |
| Full repository and CI acceptance                        | Not achieved: 41 formatting files; dependency audit red; full API/Web E2E and generated consistency debts remain                                                       |

No migrations were added by D3; schema compatibility is preserved. This is not a
claim that a future D3.5 migration is reviewed. Latest CI observation: Windows and
Linux containment passed; dependency audit failed; aggregate quality and Web smoke
were still running. A live job is not a pass and must not be restarted merely
because logs are unavailable.

## Remaining disposition before acceptance

- Registration rollback characterization is now verified within its documented
  transaction boundary; continue remaining security/full-baseline review.
- Explicitly retain DEBT-040 DTO metadata and DEBT-041 TOTP test defects in their
  agreed quality work; do not treat all passing selected tests as coverage of them.
- DEBT-047 is unresolved. Owner deferred new owner/Command Deck product policy to
  its relevant phases; the six-key proposal is superseded, not a mitigation.
- Resolve full baseline gates through D6/D7 and obtain review; no merge of red PR.

D3.5 may be designed for scope approval; implementation/branch creation remains
separate. See [brainstorm](../development/D3_5_ACCESS_GROUPS_BRAINSTORM.md).
