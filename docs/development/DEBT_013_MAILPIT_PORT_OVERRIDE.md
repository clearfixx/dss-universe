# DEBT-013 — Configurable SMTP host port

Status: implementation/recovery candidate; full gate and acceptance open.
Baseline: accepted main c6b5417. No application/API or Windows settings change.

## Evidence and change

The existing own Mailpit container is healthy, but effective host bindings are
empty. On2026-10-28, actual loopback bind2525 failed AccessDenied and Windows
reported TCP exclusion2428–2527.12525/18025 bind successfully. A restart with the
old mapping was therefore not attempted. Two messages/unread2 were fingerprinted
internally without printing headers/body; their sorted opaque-ID set SHA256 is
65fe82afffd97b8c0849791c9dc71dd138cfbae0daf3d7be7718eb1c807b787a.
No mailbox or other service was changed during diagnosis.

Compose now supports DSS_MAILPIT_SMTP_PORT, default2525. The fixed host address
remains127.0.0.1; target SMTP1025, UI18025→8025, image, healthcheck and persistent
dss_mailpit_data volume remain unchanged. This allows a local12525 override
without changing other developers' default or Windows networking. API and Worker
MAIL_PORT must match the selected published port; their examples retain2525.

Configuration regressions resolve the real Compose model with synthetic values
and no daemon mutations. The override test compares the entire Mailpit service:
only published SMTP port may differ. Inherited override variables are neutralized
for the default case. Existing mandatory-CI, persistence, loopback and no-relay
assertions remain.

## Local recovery protocol

Revalidate ownership, same image/volume, complete mailbox-ID fingerprint and port
bindability immediately before action. Modify only the named port keys in local
Compose/API/Worker env files, preserving credentials and other uncommitted data.
Recreate only Mailpit with --no-deps and --pull never under the existing Compose
project; no volume deletion, database/Redis restart or foreign process termination.
Verify effective bindings, readyz, SMTP220/EHLO250/QUIT221 without DATA, then the
same mailbox IDs/count/unread and persistent volume/image. Host app processes
using an old env need their normal restart; do not stop unrelated running apps.

The preparation metadata at node_modules/.cache/mailpit-recovery-before-20261028.json
records the corrected per-port results. The initial shell had continued after a
socket exception and incorrectly labeled availability; that record was corrected
before any restart. Recovery is not established by a healthy container or green
configuration tests alone. Full quality/CI and real host readiness evidence will
be recorded separately; earlier accepted PR91 remains historical preservation proof.
