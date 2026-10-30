# DEBT-037 — P2 admission and API integration proposal

Status: work in progress; no runtime implementation or activation authorized by
this document. Baseline: accepted main e4ad7cc (P1 and helper preservation).

## Evidence and remaining guarantees

P1 establishes asynchronous native opening/inspection, opaque capabilities and
resource lifetime. It does not establish whole-chain admission, effective ACLs,
safe publication or conditional cleanup. Its green three-platform tests prove
the tested prototype, not these missing guarantees.

The API adapter currently uses recursive mkdir, writeFile, readFile and rm on
resolved pathnames. Its tests establish portable key rejection and nested-key
compatibility. They do not exercise the agreed different-OS-user attacker with
write access to uploads. Worker scanner/transform/cleanup also resolve paths;
an API-only change cannot close the complete debt.

Source anchors:

- apps/api/src/core/storage/providers/local-storage.provider.ts
- apps/api/src/core/storage/interfaces/storage-provider.interface.ts
- apps/api/src/core/storage/providers/local-storage.provider.spec.ts
- packages/storage/native-probe/src/platform-win.cc
- packages/storage/native-probe/src/platform-posix.cc
- apps/worker/src/clamav-media-malware.scanner.ts
- apps/worker/src/local-media-file.processor.ts

## Proposed delivery order within P2

1. Prove root/control-directory admission independently of application activation.
   Walk every ancestor through actual opened objects. Reject unsafe ownership,
   metadata-changing rights, links/reparse points and unsupported filesystem or
   mount transitions. Pin the admitted resources for their required lifetime.
   A final-component no-follow flag or string realpath is insufficient.
2. Prove exclusive private staging, output-parent admission and publication on
   each supported platform. Preserve the hierarchical key format. Existing
   attacker-controlled prefixes cannot become trusted just because they exist.
3. Prove read, delete-current-key and identity-bound cleanup separately. Cleanup
   must not delete a replacement object; check-then-unlink is not that guarantee.
   Define coordination across API and Worker before selecting a lock primitive.
4. Only after those proofs, implement the separate storage infrastructure entry
   point and API adapter integration. Preserve the StorageProvider contract:
   save(buffer, directory, filename) returns the existing path and uploads URL;
   read returns Buffer; delete retains its established missing-file behavior.
5. Coordinate rollout with P3 Worker integration and P4 deployment acceptance.
   An experimental adapter must be explicitly inactive; activation must never
   silently fall back to the old pathname route when native admission fails.

This order adds proof obligations, not a request to reduce the attacker model.
No existing uploads ACLs, owners or data are changed automatically.

## Platform policy that must be proved before implementation selection

Windows admission needs actual service token groups/privileges and effective
rights on opened ancestors, public directories and private control objects.
Different-user attack tests must include inherited grants and preexisting
handles. A restricted-token approximation alone does not certify a distinct
logon identity. Handle sharing must permit the selected publication operation;
P1 sharing flags alone are not a sufficient admission policy.

POSIX admission needs ownership, mode and ACL semantics for every ancestor and
created directory, including sticky and writable parents, descriptor-relative
renames and mount boundaries. Linux evidence cannot stand in for macOS ACL and
filesystem behavior. A supported configuration must be explicit; unsupported
configurations fail closed without permission repair or pathname fallback.

The exact syscall/ACL implementation and supported filesystem matrix remain
open until primary-platform documentation and adversarial probes are reviewed.
This proposal does not declare arbitrary Windows/POSIX installations supported.

## Acceptance matrix

| Surface             | Required proof                                                                                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Admission           | Unsafe ancestor/root/control metadata rejected before payload IO; complete chain checked; resource cleanup on refusal                                   |
| Concurrent attacker | Different OS identity can write uploads; junction/symlink/replacement/relocation and preexisting-handle attempts do not reach outside sentinels         |
| Save/publication    | Full key plan validated first; exclusive private staging; admitted parents; exact produced bytes published; partial failure disposes only owned outputs |
| Read                | Actual regular-file identity admitted; links and unsupported objects rejected; unchanged successful API bytes                                           |
| Delete              | Missing-key compatibility, delete-current semantics and captured-object cleanup distinguished; replacement not removed by stale cleanup                 |
| Lifecycle           | Close/failure/in-flight behavior, partial initialization and application shutdown release resources                                                     |
| API/Media           | Existing URLs, upload limits, authorization, DB state ordering and audit preserved; HTTP regressions on disposable DB                                   |
| Worker boundary     | No handles/paths in jobs or business contracts; P3 integration and cross-process coordination explicitly tracked                                        |
| Platforms/gates     | Real Windows/Linux/macOS evidence, native checks, full quality gate, CI and owner packet acceptance                                                     |

## Next review boundary

First review the admission/publication/cleanup protocol and platform test setup.
Then request authorization for the concrete runtime subpacket, including any
new dependency or distinct-user fixture provisioning. No compiler installation,
ACL repair, user creation, data migration or runtime switch is implied here.

All new ad hoc investigation scripts belong under tools/agent-helpers/debt037/.
Generated evidence may remain in ignored data files; historical archive helpers
are not executed or rewritten automatically. The frontend checkout stays owned
by its separate development task.
