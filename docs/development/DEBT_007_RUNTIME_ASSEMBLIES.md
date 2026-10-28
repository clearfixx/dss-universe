# DEBT-007 — Runtime assemblies, package A/A.1

Status: owner-accepted and merged in PR101/merge2c42e89 on 2026-10-28.
Accepted head: `7a8abbe`; CI 5/5, local quality:full exit 0, coverage 8/8
(API 1463/1463), E2E 661/661 without skips, Web 15/15 without retries.
Accepted source baseline: `ebd77b8` (PR87), following design PR100/merge625d1b9.

## Approved scope

The owner separately authorized reusable owner-local providers, narrow named
event consumers, minimal Users existence composition and isolation/singleton/
lifecycle verification. A.1 additionally authorizes cleanup after failed Prisma
connection setup, preserving the original failure even if cleanup fails.

No queue, routing migration, background processor, activation command, formula,
historical replay or UI belongs to this package. DEBT-007 delivery and D7 remain
open. The [delivery plan](DEBT_007_RUNTIME_PLAN.md) retains the accepted cutoff
and future routing/operations decisions.

## Provider and public boundaries

| Assembly                              | Responsibility                                                              | Public capability                                                                      |
| ------------------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Points private providers              | One existing service/repository plus the existing immutable balance reader  | None through index.ts                                                                  |
| Levels/Achievements private providers | One existing owner service/repository each                                  | None through index.ts                                                                  |
| Owner API wrappers                    | Existing resolvers over the private providers                               | Existing Nest exports unchanged                                                        |
| Owner runtime wrappers                | Delegate explicit calls to each existing consume command                    | Named consumer token/interface/module; Points also exports its existing balance reader |
| Users existence providers/wrapper     | Shared ID-only reader, without Users presentation/presence                  | Existing PROFILE_EXISTENCE_READER and minimal UsersExistenceModule                     |
| Root consumer composition             | Bind recipient/balance ports and real manual-award transaction dependencies | Narrow owner runtimes and required input ports                                         |

Private provider modules export service classes only to their owner-local Nest
wrappers. Those classes, repositories, private module classes and internal alias
tokens are absent from public index exports. API and runtime wrappers share the
same private provider module; aliases return the same Points balance object.
Users API and its existence-only wrapper alias the same private reader token.
No mutable foreign service is injected into another feature owner.

The architecture guard adds only the explicit approved module/token/interface
names. Unknown exports and wildcard/namespace exports remain rejected; the
frozen finding baseline is not refreshed or waived.

Each new consumption capability exposes only consume(event): Promise<void> over
the existing IntegrationEventJob. Completion means the owned command finished,
including owned no-ops; it does not disclose ledger entries or claim that an
effect was awarded. Each call reaches its owner; exceptions retain identity.
No cross-call cache, outer processed marker or replacement scoring policy is
introduced. Existing owner idempotency and atomic Audit/Outbox effects remain
inside existing repositories.

Root composition retains the real manual-award transaction, writer and Users
transactional reader required by Achievements construction. No fake manual port
or Custom Titles import substitutes for that dependency. Recipient existence
remains ID-to-boolean, without a new ACTIVE/status predicate. The root assembly
is available for a later headless entrypoint; it is not imported into AppModule
and does not start automatic consumption itself.

## A.1 initialization failure

The initial lifecycle experiment confirmed that installed Nest11.2.7 close()
awaits initializationPromise before destroy hooks. When init rejects, close
rethrows that failure without reaching those hooks. This was a framework
lifecycle observation with a stub, not proof of a real TCP leak.

PrismaService now owns cleanup of its failed connect attempt: await disconnect,
then rethrow the original value. A failed disconnect emits only a fixed generic
warning and does not replace the connection failure. Successful initialization
and normal shutdown retain their existing behavior. No retries, deadlines,
database options or transaction boundaries change.

This protects the failed Prisma connection hook. It is not a general guarantee
that every future queue/Redis/other bootstrap failure releases all resources;
those resources and the eventual process bootstrap need their own later design.

## Focused evidence

- Source typecheck passed before full gate; existing API public-export unit
  assertions remain unchanged.
- Focused units:15/15 across three suites, including real Nest assembly,
  API/runtime service/repository singleton identity, the shared balance alias,
  fresh ID-only recipient reads, narrow immutable command objects, error identity
  and lifecycle cleanup. Driver IO is mocked in these unit tests.
- Migrated owned-schema integration:3/3. A real PrismaService context is healthy,
  starts no presentation/queue modules or automatic effects, applies one explicit
  Points command using migration defaults, preserves effect/marker/Audit/Outbox
  dedup on replay and retains all three owners' no-op behavior. Explicit test
  calls are not evidence of producer-to-queue delivery.
- A.1 negative control: restoring the old connect hook makes3/5 lifecycle units
  fail; the original two successful/shutdown cases remain green. The reviewed
  hook restores the focused green result. Raw RED report/log are
  `node_modules/.cache/debt007-a1-core-red.json` and `.log`.
- Focused unit report/log are
  `node_modules/.cache/debt007-a-focused-units.json` and `.log`; integration log
  is `node_modules/.cache/debt007-a-focused-e2e.log` in d6-quality-baseline.

The first assembly experiment assumed Nest would destroy after rejected init;
that observed limitation prompted A.1. The permanent regression invokes
the real PrismaService hook with mocked connect/disconnect and checks cleanup
before framework close, rather than pretending close calls a missing hook.

Complete format/lint/types/schema/drift/coverage/E2E/generated API/build/Web smoke
and current-head CI remain the acceptance gate. Focused evidence alone does not
accept this package, finish automatic delivery, waive current Mailpit readiness
or authorize Phase11.
