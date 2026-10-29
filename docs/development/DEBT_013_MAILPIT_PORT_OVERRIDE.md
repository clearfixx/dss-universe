# DEBT-013 — Configurable SMTP host port

Status: implementation/recovery candidate; full gate and acceptance open.
Baseline: accepted main701cb87 (including PR105/107). No application/API or Windows settings change.

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

## Recovery evidence — 2026-10-29

Recreated only Mailpit with no dependencies and no image pull. The same image
sha256:74d609a42ec279aa63c6b4622a6fa9b5408d1ad5b1d76a1c4be40a265ce0863d
and persistent dss-universe_dss_mailpit_data volume are retained. Effective host
bindings are127.0.0.1:12525→1025 and127.0.0.1:18025→8025. Host readyz returns200;
SMTP greeting220, EHLO250 and QUIT221 succeed without DATA.

All two message IDs, total2 and unread2 are unchanged; the ID-set fingerprint
above still matches. All other containers retain identical IDs and exact
StartedAt strings, including PostgreSQL/Redis/ClamAV and test services. An initial
comparison incorrectly treated JSON dates as local DateTime values; rechecking
the original ISO strings proved equality. No other container was restarted.
The Compose orphan warning referred to existing disposable test containers;
they were preserved and no remove-orphans operation was used.

Only DSS_MAILPIT_SMTP_PORT in the primary root env and MAIL_PORT in API/Worker
env were set to12525. The guarded updater preserves all other text, encoding
and credentials. The own dev process is restarted separately to load this env.
Protocol verification does not assert an application email was sent; no
synthetic message was added to the preserved mailbox in this check.

Local evidence is retained in node_modules/.cache/mailpit-recovery-before-20261029.json,
mailpit-recovery-after-20261029.json and the other-container snapshots. Full
quality/CI and package acceptance remain open at this recovery checkpoint.

## Accepted security integration — 2026-10-29

The initial PR106 head31b8e1c gate exited1 at security:check because of newly
reported high GHSA-3f7j-7jwc-fxfj; its raw log is retained. Separate patch-only
DEBT-089 PR107 head56ed7da was owner-accepted and merged as701cb87, supported
by CI5/5 and local full gate0 (coverage8/8, E2E686/686, Web15/15). This branch
now integrates that accepted main; no dependency waiver or unrelated upgrade.
The primary checkout's frozen installation was updated to this accepted patch.

Worker-configured Nodemailer.verify also succeeds against loopback12525 with
its configured authentication and no DATA. The own dev process is restarted
after dependency installation. Mailpit's new integration head requires its own
full quality/CI before package acceptance; PR107's gate is not substituted for it.
