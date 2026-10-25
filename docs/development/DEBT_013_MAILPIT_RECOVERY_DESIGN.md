# DEBT-013 — Local Mailpit recovery design

Status: owner-approved diagnosis/recovery package; design checkpoint only.
Branch: `debt/debt-013-mailpit-readiness`.
Accepted source baseline: `746d981`.

## Confirmed observations

- Compose declares loopback host1025/8025 to container1025/8025.
- Running Mailpit is healthy, but NetworkSettings has empty published mappings.
- Host1025 belongs to PID1432 (`services.exe`); host1026 is also occupied.
  These observations do not identify the underlying Windows service or prove
  why Docker lost its mappings. No foreign process is stopped.
- Candidate host2525/18025 have no current listener and are outside the observed
  IPv4/IPv6 excluded TCP ranges. This is not a guarantee against a later race.
- Container has no mounts. `docker diff` shows SQLite databases and WAL/SHM
  files under `/tmp`. Removing/recreating it could discard local mail history.

## Intended boundary

Keep container SMTP1025 and HTTP8025 unchanged. Publish SMTP on loopback2525
and mailbox UI on loopback18025, with explicit Compose mappings. Custom topology
uses a Compose override plus matching consumer env values, not silent defaults.
API and Worker run on the host and must use the same MAIL_HOST/MAIL_PORT facts;
container-internal addressing must not be confused with the host mapping.
No application mail-provider behavior, credentials, product UI or dependency
upgrade belongs to this package.

## Recovery prerequisites and sequence

1. Recheck Compose ownership, endpoint availability and actual mail consumers.
   Inspect only required non-secret configuration fields; do not print env files.
2. Establish a supported, consistent mailbox preservation/export procedure for
   the installed Mailpit version. A live copy of a SQLite main file without its
   WAL is not adequate proof of preservation. Retain original container/storage
   until the preserved mailbox has been verified. Do not commit mailbox data.
3. Design persistent local mailbox storage and rollback before replacing the
   container. Do not use compose down, delete volumes, reset databases or restart
   PostgreSQL/Redis. Limit any approved service operation to Mailpit.
4. Apply the host-port and local consumer alignment as a separate implementation
   checkpoint after preservation is proven. Recheck ports immediately before bind.
5. Verify effective published mappings, bounded SMTP220/EHLO/QUIT and HTTP readyz.
   Then send only an explicitly synthetic local message and confirm retrieval,
   without external SMTP delivery or exposure of existing message contents.
6. Add focused configuration/readiness regressions and run the complete quality
   gate/CI on the candidate. Owner acceptance precedes merge.

## Current result and limits

Installed CLI help confirms `dump --http` and `ingest --smtp-addr` support.
The [official export guide](https://mailpit.axllent.org/docs/usage/import-export/)
documents API export for active instances; exported messages do not preserve
every mailbox database attribute. The
[storage guide](https://mailpit.axllent.org/docs/configuration/email-storage/)
distinguishes default temporary databases from explicit persistent storage.

A bounded internal API read returned total0/unread0. The attempted API dump
returned exit1, `no messages found`; this is not a successful backup. Existing
SQLite files do not prove they contain messages, and this active-mailbox count
does not certify older database files are empty. No existing content was printed.
Preservation of the older container files remains required before recreation.

A scoped pause/copy/unpause preserved `/tmp` as a frozen set in ignored local
`node_modules/.cache/mailpit-preservation-20261025-01`: 24 files, 3,900,168 bytes,
eight SQLite databases plus eight WAL and eight SHM files. SHA256 reading of all
24 files succeeds. This proves capture/readability, not SQLite integrity or a
successful restored mailbox; those checks remain required. Do not delete this
evidence or commit mailbox data. The original container and files are retained.
After unpause the container is running/not paused; its transient unhealthy
observation subsequently returns healthy. No other container was paused.

A separate verification copy passes read-only SQLite `integrity_check` for all
eight databases (each returns only `ok`). Aggregate-only counts find one
historical database with one mailbox row and one mailbox_data row; the other
seven have zero mailbox rows. Thus the empty active API mailbox must not be used
to justify deleting historical storage. Message bodies, subjects and recipients
were not selected. Restore-through-Mailpit verification remains open.

Restore verification subsequently succeeds using another copy and the installed
image `sha256:74d609a42ec279aa63c6b4622a6fa9b5408d1ad5b1d76a1c4be40a265ce0863d`.
Isolated container `dss-mailpit-restore-probe` has network mode `none` and no
published ports. Its API returns total1/unread1 from the historical database;
no message content is emitted. The probe is stopped afterward and retained for
recovery, not removed. Original Mailpit remains running/healthy. Backup,
verification and restore working copies remain separate and ignored by Git.
This proves this one historical mailbox can be read by Mailpit, not host SMTP
readiness or application delivery. Those acceptance steps remain open.

No Compose/env edit, container stop/recreate, external mail or installation has
been performed. Host readiness remains open. No Docker/WSL root cause is asserted.
This separate package does not accept D7 or start the stack audit.
