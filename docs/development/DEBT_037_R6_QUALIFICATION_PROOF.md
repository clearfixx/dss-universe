# DEBT-037 R6 — Standalone qualification query proof

Owner accepted design/characterization PR139 (merge `64e6b14`) and separately
authorized this proof-only implementation. The
[accepted proposal](DEBT_037_R6_QUALIFICATION_PROPOSAL.md) defines its gates.
Implementation verification and packet acceptance remain pending.

## Scope and evidence boundary

The new `dss_qualification_proof` standalone executable is outside the Node
addon and public package exports. Platform acquisition, bounded projection and
CI provisioning remain separate files. It reuses the accepted captured-object,
topology and actual credential-context readers without modifying R1–R5.

Fixed facts distinguish `present` boolean values from `unavailable` and
`unsupported` null values and preserve numeric errors. Output includes no raw
IDs, paths, namespace maps, ACL bytes or tokens. Every result retains
`admitted:false`, `filesystemQualified:false`, `hostIdentityQualified:false`
and `operationQualified:false`. No production profile or admitted-root exists.
The credential-consistency result does not certify an initial host namespace.

`--inspect` is a read-only current-user diagnostic used only with fresh fixtures
by local tests. `--actor` and `--hold` require opted-in hosted-CI environment and
an actual ordinary context. POSIX ordinary-mode checks include failed direct
root regain. Windows independently checks the native child's non-elevation;
the accepted R5 launcher also verifies the actual Node child's expected SID and
primary token before it runs the probe.

Held mode captures objects before a ready/go barrier and retains them into an
actual async worker. The controller directs a distinct attacker to create a
synthetic symlink/junction below the captured shared parent, then releases the
service query. A separate capture of the new alias must refuse traversal. This
is a query/transition control, not a publication/delete containment proof.
The accepted historical-handle counterexamples still remain relevant.

## Platform routes and explicit limits

Windows uses a handle-bound `NtQueryVolumeInformationFile` device query and
checks both completion statuses and the exact returned extent. The small
documented device-information ABI is represented locally with compile-time
size/offset checks, using existing user-mode SDK types; no WDK is installed.
Remote-device/removable-media flags are driver observations, not a mount ID or
a certificate of locality/containment. No actual remote/removable fixture is
provisioned by this packet; those controls are explicitly unsupported.

Linux requests only mount-basic data, bound to a returned **unique** mount ID
from the held descriptor. It checks response size, returned mask, expected ID
and a subsequent unique-ID query. No legacy-ID or path/mountinfo fallback is
used. Namespace context compares held/fresh current-thread user/mount namespace
objects after verifying nsfs type. Raw namespace identities stay private. This
shows context consistency, not a host/domain trust classification. Missing SDK
features, permission errors and absent fields remain explicit unresolved facts.
No UID/GID mapping strings are requested or parsed.

Darwin reads ownership-ignored, snapshot, read-only and local flags through
the held descriptor and installed SDK constants. It does not infer absent ACLs,
unique mount identity, ownership enforcement or APFS operation guarantees from
the family/local label. Ownership-disabled and enabled fixtures are separate
new disposable images, never developer volume settings.

## Provisioning and ordinary actors

The wrapper refuses developer invocation before provisioning. Only opted-in
disposable hosted CI may invoke the guarded controllers. Existing R5 managed
Windows launch code is reused without changing it; POSIX drops credentials and
groups before exec using the existing runner/nobody identities. Windows creates
only invocation-owned ordinary accounts and removes only matching SID/description
accounts. It never deletes profiles or recursively follows fixture entries.

Linux first enters and verifies a distinct mount namespace, then makes its
propagation private before mounting anything. It creates tmpfs, bind and idmapped
controls below a fresh root-owned arena. The idmapped view maps the synthetic
service-owned source to displayed UID/GID0; the service and attacker processes
retain ordinary credentials. Controller metadata independently verifies that
the view differs; numeric identities/maps are not published. This deliberately
avoids mistaking an overflow UID for a successfully mapped ordinary account.

Darwin creates sparse APFS images with existing tools and attaches each under
an invocation-owned mountpoint with ownership on/off. Actual service writes and
attacker creation attempts accompany descriptor-bound flag queries. Namespace,
mount and image setup happen only in the disposable controller. Cleanup detaches
only recorded invocation-owned mounts and never recursively removes fixtures.

Unavailable fixture creation is recorded as an unresolved gate, never a pass.
Tool exit codes have their own nullable field; they are not labelled OS errno.
Unattempted remote/removable fixtures contain no invented OS failure code.
If an independently provisioned fixture has a present query value, it must
match the expected bind/idmapped/ownership control. Separate-volume comparison
must distinguish filesystems; bind/idmapped aliases must retain object identity
and distinguish mount identity when that query is available. Partial validated
evidence is retained on a failed controller; malformed/unbounded records are
not published.

## Verification and remaining work

Mandatory native tests cover genuine invalid-resource errors, separate decoder
negatives, worker context, real same/distinct object comparisons, malformed CLI,
developer-mode refusal, absence of raw fields and rejection of false admission
or unknown-as-false evidence. A decoder unavailable at build time is reported
as false/unsupported, never claimed to have passed synthetic decoder controls.

CI retains all R1–R5/coordination/ACL/ordinary-actor checks and adds the R6 probe
and artifact. Full local quality/build/CI is required before owner acceptance.
Receipts and failed attempts will be recorded in the packet PR. No API/Worker,
frontend, Prisma schema/data, existing uploads ACL, package dependency or public
storage export is changed.

Even a fully green proof packet does not qualify production storage. Host
identity and filesystem profiles, unsupported controls, complete admitted-root
lifecycle, all hostile operation schedules, adoption and joint API/Worker
activation remain open. DEBT-037 and D7 are not closed by this packet.

## Reviewed primary contracts

- [Microsoft volume-query completion/extent contract](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/nf-ntifs-ntqueryvolumeinformationfile)
  and [device information layout](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/ns-wdm-_file_fs_device_information).
- [Microsoft Terminal user-mode class/layout reference, pinned revision](https://github.com/microsoft/terminal/blob/cbc857bdf7749981890c5b561ee44ea31948bfb1/src/host/conddkrefs.h):
  retrieved source SHA256 `f87167a3d5fe1a72dbeed57246884327d917cad44d944c90062ba96526515537`.
  Only documented ABI facts are represented; implementation code is not copied.
- [Linux6.14 UAPI](https://github.com/torvalds/linux/blob/v6.14/include/uapi/linux/mount.h)
  and [mount-basic implementation](https://github.com/torvalds/linux/blob/v6.14/fs/namespace.c).
  Installed SDK feature gates and actual runtime queries still determine availability.
- [util-linux correction of idmap direction](https://kernel.googlesource.com/pub/scm/utils/util-linux/util-linux/+/f2bfef30ded60f0a9b15d428f13f5fa5d19e4116):
  stored inner ID maps to displayed outer ID. Fixture metadata validates the
  actual result rather than trusting a tool version or its older wording.
- [Apple public mount flags, pinned revision](https://github.com/apple-oss-distributions/xnu/blob/f6217f891ac0bb64f3d375211650a4c1ff8ca1ea/bsd/sys/mount.h).

These references support query interpretation. They are not proof of the CI
kernel/SDK's exact implementation or evidence of complete containment.
