# D3 acceptance review

Date: 2026-10-13. Reviewed revision: `71bae5c`. Status: NOT ACCEPTED / draft PR.

| Requirement                                              | Evidence and limit                                                                                                                                                                          |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth independent from Users internals                    | Whole production Auth application/domain search found no Users import, PrismaService or Prisma client reference; public integration surfaces pinned by AST regressions                      |
| Authoritative session eligibility                        | Access-session service/repository tests cover narrow projection, expiry, revocation, owner and version; detailed evidence in D3.1 report                                                    |
| Registration and combined profile transport outside Auth | Composition owns registration transaction and presentation; transaction spec proves field allowlisting and propagates failure, but mocked propagation alone is not a real DB rollback proof |
| Auxiliary Auth persistence/delivery                      | Owned recovery, verification, 2FA, counters and delivery ports; real DB/Redis tests enabled in latest full units                                                                            |
| IAM private persistence and public boundary              | Permission/role/assignment ports and adapters; metadata and root-surface tests; no remaining D3 finding in the static inventory                                                             |
| Immediate access revocation                              | Same-token REST/GraphQL authorization E2E and fail-closed read regressions; no claim of cancelling already running commands                                                                 |
| Existing assignment safety                               | DEBT-046 real concurrency/HTTP evidence; does not prove available platform owner                                                                                                            |
| Hash implementation compatibility                        | Real bcrypt tests preserve cost 12, comparison and independent salts                                                                                                                        |
| Current local package gates                              | 527 API, 59 Web, 36 Worker unit tests and 10 selected HTTP E2E passed; lint/typecheck/Prisma/build/architecture passed                                                                      |
| Full repository and CI acceptance                        | Not achieved: 41 formatting files; dependency audit red; full API/Web E2E and generated consistency debts remain                                                                            |

No migrations were added by D3; schema compatibility is preserved. This is not a
claim that a future D3.5 migration is reviewed. Latest CI observation: Windows and
Linux containment passed; dependency audit failed; aggregate quality and Web smoke
were still running. A live job is not a pass and must not be restarted merely
because logs are unavailable.

## Remaining disposition before acceptance

- Complete the security evidence matrix, including actual database registration
  rollback characterization rather than inferring it from mocked unit tests.
- Explicitly retain DEBT-040 DTO metadata and DEBT-041 TOTP test defects in their
  agreed quality work; do not treat all passing selected tests as coverage of them.
- DEBT-047 is unresolved. Owner deferred new owner/Command Deck product policy to
  its relevant phases; the six-key proposal is superseded, not a mitigation.
- Resolve full baseline gates through D6/D7 and obtain review; no merge of red PR.

D3.5 may be designed for scope approval; implementation/branch creation remains
separate. See [brainstorm](../development/D3_5_ACCESS_GROUPS_BRAINSTORM.md).
